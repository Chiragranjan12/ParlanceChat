from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect, Request, Response, Query
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from pydantic import BaseModel
from typing import Optional, List, Dict
import os, logging, bcrypt, json, re
from datetime import datetime, timezone, timedelta
from pathlib import Path
import jwt as pyjwt

ROOT_DIR = Path(__file__).parent
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]
JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')

app = FastAPI(title="Parlance API")
api_router = APIRouter(prefix="/api")
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')


# ======================== MODELS ========================
class UserCreate(BaseModel):
    email: str
    username: str
    password: str
    display_name: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None

class ChannelCreate(BaseModel):
    name: str
    description: str = ""
    channel_type: str = "public"

class GroupCreate(BaseModel):
    name: str
    description: str = ""
    member_ids: List[str] = []

class MessageCreate(BaseModel):
    content: str
    room_type: str
    room_id: str
    reply_to: Optional[str] = None

class DMCreate(BaseModel):
    recipient_id: str
    content: str
    reply_to: Optional[str] = None

class ReactionAdd(BaseModel):
    emoji: str

class StatusUpdate(BaseModel):
    status: str


# ======================== AUTH UTILS ========================
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())

def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(hours=24), "type": "access"}
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"}
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return serialize_user(user)
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")


# ======================== DB HELPERS ========================
def serialize_user(user: dict) -> dict:
    if not user:
        return None
    u = {}
    for k, v in user.items():
        if k == '_id':
            u['id'] = str(v)
        elif isinstance(v, ObjectId):
            u[k] = str(v)
        elif isinstance(v, datetime):
            u[k] = v.isoformat()
        else:
            u[k] = v
    u.pop('password_hash', None)
    return u

def serialize_doc(doc: dict) -> dict:
    if not doc:
        return None
    result = {}
    for k, v in doc.items():
        if k == '_id':
            result['id'] = str(v)
        elif isinstance(v, ObjectId):
            result[k] = str(v)
        elif isinstance(v, datetime):
            result[k] = v.isoformat()
        elif isinstance(v, list):
            result[k] = [serialize_doc(i) if isinstance(i, dict) else (str(i) if isinstance(i, ObjectId) else i) for i in v]
        elif isinstance(v, dict):
            result[k] = serialize_doc(v)
        else:
            result[k] = v
    return result


# ======================== WEBSOCKET MANAGER ========================
class ConnectionManager:
    def __init__(self):
        self.connections: Dict[str, List[WebSocket]] = {}
        self.room_users: Dict[str, set] = {}

    async def connect(self, user_id: str, ws: WebSocket):
        await ws.accept()
        if user_id not in self.connections:
            self.connections[user_id] = []
        self.connections[user_id].append(ws)

    def disconnect(self, user_id: str, ws: WebSocket):
        if user_id in self.connections:
            try:
                self.connections[user_id].remove(ws)
            except ValueError:
                pass
            if not self.connections[user_id]:
                del self.connections[user_id]

    def subscribe(self, user_id: str, room_id: str):
        if room_id not in self.room_users:
            self.room_users[room_id] = set()
        self.room_users[room_id].add(user_id)

    def unsubscribe_all(self, user_id: str):
        for room_id in list(self.room_users.keys()):
            self.room_users[room_id].discard(user_id)

    async def broadcast_room(self, room_id: str, msg: dict, exclude: str = None):
        for uid in list(self.room_users.get(room_id, set())):
            if uid == exclude:
                continue
            await self.send_to_user(uid, msg)

    async def broadcast_all(self, msg: dict, exclude: str = None):
        for uid in list(self.connections.keys()):
            if uid == exclude:
                continue
            await self.send_to_user(uid, msg)

    async def send_to_user(self, user_id: str, msg: dict):
        dead = []
        for ws in list(self.connections.get(user_id, [])):
            try:
                await ws.send_json(msg)
            except Exception:
                dead.append(ws)
        for ws in dead:
            try:
                self.connections[user_id].remove(ws)
            except ValueError:
                pass

    def is_online(self, user_id: str) -> bool:
        return bool(self.connections.get(user_id))

    def online_users(self) -> List[str]:
        return list(self.connections.keys())

manager = ConnectionManager()


# ======================== MESSAGE ENRICHMENT ========================
async def enrich_message(msg: dict) -> dict:
    m = serialize_doc(msg)
    sender = await db.users.find_one({"_id": ObjectId(m["sender_id"])}, {"password_hash": 0})
    if sender:
        m["sender"] = serialize_user(sender)
    reactions_list = await db.reactions.find({"message_id": m["id"]}).to_list(1000)
    reaction_map = {}
    for r in reactions_list:
        emoji = r["emoji"]
        if emoji not in reaction_map:
            reaction_map[emoji] = {"count": 0, "users": []}
        reaction_map[emoji]["count"] += 1
        reaction_map[emoji]["users"].append(r["user_id"])
    m["reactions"] = reaction_map
    if m.get("reply_to"):
        try:
            reply_msg = await db.messages.find_one({"_id": ObjectId(m["reply_to"])})
            if reply_msg:
                reply_sender = await db.users.find_one({"_id": ObjectId(reply_msg["sender_id"])}, {"display_name": 1, "username": 1})
                name = (reply_sender.get("display_name") or reply_sender.get("username", "")) if reply_sender else "Unknown"
                m["reply_preview"] = {"content": reply_msg.get("content", ""), "sender_name": name}
        except Exception:
            pass
    return m


# ======================== STARTUP ========================
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("username", unique=True)
    await db.channels.create_index("name")
    await db.messages.create_index([("room_id", 1), ("created_at", -1)])
    await db.channel_members.create_index([("channel_id", 1), ("user_id", 1)], unique=True)
    await db.group_members.create_index([("group_id", 1), ("user_id", 1)], unique=True)
    await db.login_attempts.create_index("identifier")

    admin_email = os.environ.get("ADMIN_EMAIL", "admin@parlance.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin1234!")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        result = await db.users.insert_one({
            "email": admin_email, "username": "admin", "display_name": "Admin",
            "password_hash": hash_password(admin_password), "avatar_url": None,
            "bio": "Parlance Administrator", "status": "offline", "role": "admin",
            "created_at": datetime.now(timezone.utc), "last_seen": datetime.now(timezone.utc)
        })
        admin_id = str(result.inserted_id)
    else:
        admin_id = str(existing["_id"])
        if not verify_password(admin_password, existing.get("password_hash", "")):
            await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})

    for ch_name, ch_desc in [("general", "General discussion for everyone"), ("random", "Off-topic conversations"), ("announcements", "Important announcements")]:
        existing_ch = await db.channels.find_one({"name": ch_name})
        if not existing_ch:
            ch_result = await db.channels.insert_one({
                "name": ch_name, "description": ch_desc, "channel_type": "public",
                "created_by": admin_id, "created_at": datetime.now(timezone.utc)
            })
            ch_id = str(ch_result.inserted_id)
            try:
                await db.channel_members.insert_one({"channel_id": ch_id, "user_id": admin_id, "role": "admin", "joined_at": datetime.now(timezone.utc)})
            except Exception:
                pass

    os.makedirs("/app/memory", exist_ok=True)
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write(f"# Parlance Test Credentials\n\n## Admin Account\n- Email: {admin_email}\n- Password: {admin_password}\n- Role: admin\n- Username: admin\n\n## Register Test User\n- Use POST /api/auth/register or the /signup page\n- Suggested: email=testuser@parlance.com, username=testuser, password=Test1234!\n\n## Key Endpoints\n- POST /api/auth/register\n- POST /api/auth/login\n- GET /api/auth/me\n- POST /api/auth/logout\n- GET /api/channels/mine\n- GET /api/dm/list\n- WS /api/ws?token=<access_token>\n")
    logger.info(f"Startup complete. Admin: {admin_email}")


# ======================== AUTH ENDPOINTS ========================
@api_router.post("/auth/register")
async def register(data: UserCreate, response: Response):
    email = data.email.lower().strip()
    username = data.username.lower().strip()
    if len(data.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    if await db.users.find_one({"username": username}):
        raise HTTPException(status_code=400, detail="Username already taken")
    user_doc = {
        "email": email, "username": username,
        "display_name": data.display_name or username,
        "password_hash": hash_password(data.password),
        "avatar_url": None, "bio": "", "status": "online", "role": "user",
        "created_at": datetime.now(timezone.utc), "last_seen": datetime.now(timezone.utc)
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    for ch_name in ["general", "random"]:
        ch = await db.channels.find_one({"name": ch_name})
        if ch:
            try:
                await db.channel_members.insert_one({"channel_id": str(ch["_id"]), "user_id": user_id, "role": "member", "joined_at": datetime.now(timezone.utc)})
            except Exception:
                pass
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    response.set_cookie("access_token", access_token, httponly=True, samesite="lax", max_age=86400, path="/")
    response.set_cookie("refresh_token", refresh_token, httponly=True, samesite="lax", max_age=604800, path="/")
    user_doc["id"] = user_id
    user_doc.pop("password_hash"); user_doc.pop("_id", None)
    user_doc["created_at"] = user_doc["created_at"].isoformat()
    user_doc["last_seen"] = user_doc["last_seen"].isoformat()
    return {"user": user_doc, "access_token": access_token}

@api_router.post("/auth/login")
async def login(data: UserLogin, response: Response, request: Request):
    email = data.email.lower().strip()
    client_ip = request.client.host if request.client else "unknown"
    identifier = f"{client_ip}:{email}"
    attempt = await db.login_attempts.find_one({"identifier": identifier})
    if attempt and attempt.get("count", 0) >= 5:
        last_at = attempt.get("last_attempt")
        if isinstance(last_at, str):
            last_at = datetime.fromisoformat(last_at)
        if last_at and (datetime.now(timezone.utc) - last_at.replace(tzinfo=timezone.utc)).total_seconds() < 900:
            raise HTTPException(status_code=429, detail="Too many failed attempts. Try again in 15 minutes.")
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(data.password, user.get("password_hash", "")):
        await db.login_attempts.update_one({"identifier": identifier}, {"$inc": {"count": 1}, "$set": {"last_attempt": datetime.now(timezone.utc).isoformat()}}, upsert=True)
        raise HTTPException(status_code=401, detail="Invalid email or password")
    await db.login_attempts.delete_one({"identifier": identifier})
    user_id = str(user["_id"])
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    response.set_cookie("access_token", access_token, httponly=True, samesite="lax", max_age=86400, path="/")
    response.set_cookie("refresh_token", refresh_token, httponly=True, samesite="lax", max_age=604800, path="/")
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"status": "online", "last_seen": datetime.now(timezone.utc)}})
    return {"user": serialize_user(user), "access_token": access_token}

@api_router.post("/auth/logout")
async def logout(response: Response, user: dict = Depends(get_current_user)):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    await db.users.update_one({"_id": ObjectId(user["id"])}, {"$set": {"status": "offline", "last_seen": datetime.now(timezone.utc)}})
    return {"message": "Logged out"}

@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user

@api_router.post("/auth/refresh")
async def refresh_token_endpoint(request: Request, response: Response):
    refresh_tk = request.cookies.get("refresh_token")
    if not refresh_tk:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = pyjwt.decode(refresh_tk, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user_id = str(user["_id"])
        access_token = create_access_token(user_id, user["email"])
        response.set_cookie("access_token", access_token, httponly=True, samesite="lax", max_age=86400, path="/")
        return {"access_token": access_token}
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


# ======================== USER ENDPOINTS ========================
@api_router.get("/users")
async def search_users(q: str = "", user: dict = Depends(get_current_user)):
    query = {"$or": [{"username": {"$regex": q, "$options": "i"}}, {"display_name": {"$regex": q, "$options": "i"}}]} if q else {}
    users = await db.users.find(query, {"password_hash": 0}).to_list(50)
    result = []
    for u in users:
        u_data = serialize_user(u)
        u_data["is_online"] = manager.is_online(str(u["_id"]))
        result.append(u_data)
    return result

@api_router.get("/users/me")
async def get_me(user: dict = Depends(get_current_user)):
    return user

@api_router.put("/users/me")
async def update_profile(data: UserUpdate, user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if update_data:
        await db.users.update_one({"_id": ObjectId(user["id"])}, {"$set": update_data})
    updated = await db.users.find_one({"_id": ObjectId(user["id"])}, {"password_hash": 0})
    return serialize_user(updated)

@api_router.get("/users/{user_id}")
async def get_user(user_id: str, user: dict = Depends(get_current_user)):
    target = await db.users.find_one({"_id": ObjectId(user_id)}, {"password_hash": 0})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    u = serialize_user(target)
    u["is_online"] = manager.is_online(user_id)
    return u


# ======================== CHANNEL ENDPOINTS ========================
@api_router.get("/channels")
async def list_all_channels(user: dict = Depends(get_current_user)):
    channels = await db.channels.find({}).to_list(100)
    result = []
    for ch in channels:
        ch_data = serialize_doc(ch)
        member = await db.channel_members.find_one({"channel_id": ch_data["id"], "user_id": user["id"]})
        ch_data["is_member"] = bool(member)
        ch_data["member_count"] = await db.channel_members.count_documents({"channel_id": ch_data["id"]})
        result.append(ch_data)
    return result

@api_router.get("/channels/mine")
async def my_channels(user: dict = Depends(get_current_user)):
    memberships = await db.channel_members.find({"user_id": user["id"]}).to_list(100)
    channel_ids = [ObjectId(m["channel_id"]) for m in memberships]
    channels = await db.channels.find({"_id": {"$in": channel_ids}}).to_list(100)
    result = []
    for ch in channels:
        ch_data = serialize_doc(ch)
        ch_data["member_count"] = await db.channel_members.count_documents({"channel_id": ch_data["id"]})
        result.append(ch_data)
    return result

@api_router.post("/channels")
async def create_channel(data: ChannelCreate, user: dict = Depends(get_current_user)):
    name = data.name.lower().strip().replace(" ", "-")
    if await db.channels.find_one({"name": name}):
        raise HTTPException(status_code=400, detail="Channel name already exists")
    ch_doc = {"name": name, "description": data.description, "channel_type": data.channel_type, "created_by": user["id"], "created_at": datetime.now(timezone.utc)}
    result = await db.channels.insert_one(ch_doc)
    ch_id = str(result.inserted_id)
    await db.channel_members.insert_one({"channel_id": ch_id, "user_id": user["id"], "role": "admin", "joined_at": datetime.now(timezone.utc)})
    ch_doc["id"] = ch_id
    ch_doc.pop("_id", None)
    ch_doc["created_at"] = ch_doc["created_at"].isoformat()
    return ch_doc

@api_router.post("/channels/{channel_id}/join")
async def join_channel(channel_id: str, user: dict = Depends(get_current_user)):
    if not await db.channels.find_one({"_id": ObjectId(channel_id)}):
        raise HTTPException(status_code=404, detail="Channel not found")
    if await db.channel_members.find_one({"channel_id": channel_id, "user_id": user["id"]}):
        return {"message": "Already a member"}
    await db.channel_members.insert_one({"channel_id": channel_id, "user_id": user["id"], "role": "member", "joined_at": datetime.now(timezone.utc)})
    manager.subscribe(user["id"], channel_id)
    return {"message": "Joined successfully"}

@api_router.delete("/channels/{channel_id}/leave")
async def leave_channel(channel_id: str, user: dict = Depends(get_current_user)):
    await db.channel_members.delete_one({"channel_id": channel_id, "user_id": user["id"]})
    return {"message": "Left channel"}

@api_router.get("/channels/{channel_id}/members")
async def channel_members_list(channel_id: str, user: dict = Depends(get_current_user)):
    members = await db.channel_members.find({"channel_id": channel_id}).to_list(500)
    user_ids = [ObjectId(m["user_id"]) for m in members]
    users = await db.users.find({"_id": {"$in": user_ids}}, {"password_hash": 0}).to_list(500)
    result = []
    for u in users:
        u_data = serialize_user(u)
        u_data["is_online"] = manager.is_online(str(u["_id"]))
        result.append(u_data)
    return result

@api_router.get("/channels/{channel_id}/messages")
async def channel_messages(channel_id: str, before: Optional[str] = None, limit: int = 50, user: dict = Depends(get_current_user)):
    if not await db.channel_members.find_one({"channel_id": channel_id, "user_id": user["id"]}):
        raise HTTPException(status_code=403, detail="Not a member of this channel")
    query = {"room_id": channel_id, "room_type": "channel"}
    if before:
        query["_id"] = {"$lt": ObjectId(before)}
    messages = await db.messages.find(query).sort("created_at", -1).limit(limit).to_list(limit)
    messages.reverse()
    return [await enrich_message(m) for m in messages]


# ======================== GROUP ENDPOINTS ========================
@api_router.get("/groups")
async def list_groups(user: dict = Depends(get_current_user)):
    memberships = await db.group_members.find({"user_id": user["id"]}).to_list(100)
    group_ids = [ObjectId(m["group_id"]) for m in memberships]
    groups = await db.groups.find({"_id": {"$in": group_ids}}).to_list(100)
    result = []
    for g in groups:
        g_data = serialize_doc(g)
        g_data["member_count"] = await db.group_members.count_documents({"group_id": g_data["id"]})
        result.append(g_data)
    return result

@api_router.post("/groups")
async def create_group(data: GroupCreate, user: dict = Depends(get_current_user)):
    group_doc = {"name": data.name, "description": data.description, "created_by": user["id"], "created_at": datetime.now(timezone.utc)}
    result = await db.groups.insert_one(group_doc)
    group_id = str(result.inserted_id)
    await db.group_members.insert_one({"group_id": group_id, "user_id": user["id"], "role": "admin", "joined_at": datetime.now(timezone.utc)})
    for member_id in data.member_ids:
        if member_id != user["id"]:
            try:
                await db.group_members.insert_one({"group_id": group_id, "user_id": member_id, "role": "member", "joined_at": datetime.now(timezone.utc)})
            except Exception:
                pass
    group_doc["id"] = group_id
    group_doc.pop("_id", None)
    group_doc["created_at"] = group_doc["created_at"].isoformat()
    return group_doc

@api_router.get("/groups/{group_id}/members")
async def group_members_list(group_id: str, user: dict = Depends(get_current_user)):
    if not await db.group_members.find_one({"group_id": group_id, "user_id": user["id"]}):
        raise HTTPException(status_code=403, detail="Not a member")
    members = await db.group_members.find({"group_id": group_id}).to_list(500)
    user_ids = [ObjectId(m["user_id"]) for m in members]
    users = await db.users.find({"_id": {"$in": user_ids}}, {"password_hash": 0}).to_list(500)
    result = []
    for u in users:
        u_data = serialize_user(u)
        u_data["is_online"] = manager.is_online(str(u["_id"]))
        result.append(u_data)
    return result

@api_router.get("/groups/{group_id}/messages")
async def group_messages(group_id: str, before: Optional[str] = None, limit: int = 50, user: dict = Depends(get_current_user)):
    if not await db.group_members.find_one({"group_id": group_id, "user_id": user["id"]}):
        raise HTTPException(status_code=403, detail="Not a member")
    query = {"room_id": group_id, "room_type": "group"}
    if before:
        query["_id"] = {"$lt": ObjectId(before)}
    messages = await db.messages.find(query).sort("created_at", -1).limit(limit).to_list(limit)
    messages.reverse()
    return [await enrich_message(m) for m in messages]


# ======================== MESSAGE ENDPOINTS ========================
@api_router.post("/messages")
async def send_message(data: MessageCreate, user: dict = Depends(get_current_user)):
    if data.room_type == "channel":
        if not await db.channel_members.find_one({"channel_id": data.room_id, "user_id": user["id"]}):
            raise HTTPException(status_code=403, detail="Not a member")
    elif data.room_type == "group":
        if not await db.group_members.find_one({"group_id": data.room_id, "user_id": user["id"]}):
            raise HTTPException(status_code=403, detail="Not a member")
    msg_doc = {"content": data.content, "sender_id": user["id"], "room_type": data.room_type, "room_id": data.room_id, "reply_to": data.reply_to, "is_deleted": False, "edited_at": None, "created_at": datetime.now(timezone.utc)}
    result = await db.messages.insert_one(msg_doc)
    msg_doc["_id"] = result.inserted_id
    enriched = await enrich_message(msg_doc)
    await manager.broadcast_room(data.room_id, {"type": "message", "data": enriched})
    return enriched

@api_router.put("/messages/{message_id}")
async def edit_message(message_id: str, body: dict, user: dict = Depends(get_current_user)):
    msg = await db.messages.find_one({"_id": ObjectId(message_id)})
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    if msg["sender_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Cannot edit others' messages")
    new_content = body.get("content", "").strip()
    if not new_content:
        raise HTTPException(status_code=400, detail="Content cannot be empty")
    await db.messages.update_one({"_id": ObjectId(message_id)}, {"$set": {"content": new_content, "edited_at": datetime.now(timezone.utc).isoformat()}})
    updated = await db.messages.find_one({"_id": ObjectId(message_id)})
    enriched = await enrich_message(updated)
    await manager.broadcast_room(msg["room_id"], {"type": "message_edited", "data": enriched})
    return enriched

@api_router.delete("/messages/{message_id}")
async def delete_message(message_id: str, user: dict = Depends(get_current_user)):
    msg = await db.messages.find_one({"_id": ObjectId(message_id)})
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    if msg["sender_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Cannot delete others' messages")
    await db.messages.update_one({"_id": ObjectId(message_id)}, {"$set": {"is_deleted": True, "content": "This message was deleted"}})
    await manager.broadcast_room(msg["room_id"], {"type": "message_deleted", "message_id": message_id, "room_id": msg["room_id"]})
    return {"message": "Deleted"}

@api_router.post("/messages/{message_id}/reactions")
async def toggle_reaction(message_id: str, data: ReactionAdd, user: dict = Depends(get_current_user)):
    msg = await db.messages.find_one({"_id": ObjectId(message_id)})
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    existing = await db.reactions.find_one({"message_id": message_id, "user_id": user["id"], "emoji": data.emoji})
    if existing:
        await db.reactions.delete_one({"_id": existing["_id"]})
        action = "remove"
    else:
        await db.reactions.insert_one({"message_id": message_id, "user_id": user["id"], "emoji": data.emoji, "created_at": datetime.now(timezone.utc)})
        action = "add"
    ws_payload = {"type": "reaction", "message_id": message_id, "emoji": data.emoji, "user_id": user["id"], "action": action, "room_id": msg["room_id"]}
    await manager.broadcast_room(msg["room_id"], ws_payload)
    return {"action": action, "emoji": data.emoji}


# ======================== DM ENDPOINTS ========================
def get_dm_room_id(user1_id: str, user2_id: str) -> str:
    ids = sorted([user1_id, user2_id])
    return f"dm_{ids[0]}_{ids[1]}"

@api_router.get("/dm/list")
async def list_dms(user: dict = Depends(get_current_user)):
    user_id = user["id"]
    all_dms = await db.messages.find({"room_type": "dm"}).sort("created_at", -1).to_list(2000)
    rooms_seen = {}
    for msg in all_dms:
        room_id = msg["room_id"]
        parts = room_id.split("_", 2)
        if len(parts) != 3:
            continue
        _, id1, id2 = parts
        if user_id not in [id1, id2]:
            continue
        if room_id not in rooms_seen:
            rooms_seen[room_id] = msg
    result = []
    for room_id, last_msg in rooms_seen.items():
        parts = room_id.split("_", 2)
        _, id1, id2 = parts
        other_id = id2 if id1 == user_id else id1
        try:
            other_user = await db.users.find_one({"_id": ObjectId(other_id)}, {"password_hash": 0})
            if other_user:
                u_data = serialize_user(other_user)
                u_data["is_online"] = manager.is_online(other_id)
                u_data["room_id"] = room_id
                u_data["last_message_preview"] = last_msg.get("content", "")[:80]
                result.append(u_data)
        except Exception:
            continue
    return result

@api_router.get("/dm/{other_user_id}/messages")
async def get_dm_messages(other_user_id: str, before: Optional[str] = None, limit: int = 50, user: dict = Depends(get_current_user)):
    room_id = get_dm_room_id(user["id"], other_user_id)
    query = {"room_id": room_id, "room_type": "dm"}
    if before:
        query["_id"] = {"$lt": ObjectId(before)}
    messages = await db.messages.find(query).sort("created_at", -1).limit(limit).to_list(limit)
    messages.reverse()
    return [await enrich_message(m) for m in messages]

@api_router.post("/dm")
async def send_dm(data: DMCreate, user: dict = Depends(get_current_user)):
    other_user = await db.users.find_one({"_id": ObjectId(data.recipient_id)})
    if not other_user:
        raise HTTPException(status_code=404, detail="User not found")
    room_id = get_dm_room_id(user["id"], data.recipient_id)
    msg_doc = {"content": data.content, "sender_id": user["id"], "room_type": "dm", "room_id": room_id, "reply_to": data.reply_to, "is_deleted": False, "edited_at": None, "created_at": datetime.now(timezone.utc)}
    result = await db.messages.insert_one(msg_doc)
    msg_doc["_id"] = result.inserted_id
    enriched = await enrich_message(msg_doc)
    ws_payload = {"type": "message", "data": enriched}
    await manager.send_to_user(user["id"], ws_payload)
    await manager.send_to_user(data.recipient_id, ws_payload)
    return enriched


# ======================== PRESENCE & SEARCH ========================
@api_router.get("/presence")
async def get_presence(user: dict = Depends(get_current_user)):
    return {"online_users": manager.online_users()}

@api_router.put("/presence/status")
async def update_status(data: StatusUpdate, user: dict = Depends(get_current_user)):
    if data.status not in ["online", "idle", "dnd", "offline"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    await db.users.update_one({"_id": ObjectId(user["id"])}, {"$set": {"status": data.status}})
    await manager.broadcast_all({"type": "presence", "user_id": user["id"], "status": data.status})
    return {"status": data.status}

@api_router.get("/search")
async def search(q: str, user: dict = Depends(get_current_user)):
    channels = await db.channels.find({"name": {"$regex": q, "$options": "i"}}).to_list(10)
    users = await db.users.find({"$or": [{"username": {"$regex": q, "$options": "i"}}, {"display_name": {"$regex": q, "$options": "i"}}]}, {"password_hash": 0}).to_list(10)
    messages = await db.messages.find({"content": {"$regex": q, "$options": "i"}, "is_deleted": False}).limit(20).to_list(20)
    return {
        "channels": [serialize_doc(ch) for ch in channels],
        "users": [serialize_user(u) for u in users],
        "messages": [serialize_doc(m) for m in messages]
    }


# ======================== WEBSOCKET ========================
@api_router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(None)):
    user_id = None
    try:
        if not token:
            await websocket.close(code=4001)
            return
        try:
            payload = pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            user_id = payload["sub"]
        except Exception:
            await websocket.close(code=4001)
            return

        await manager.connect(user_id, websocket)
        memberships = await db.channel_members.find({"user_id": user_id}).to_list(200)
        for m in memberships:
            manager.subscribe(user_id, m["channel_id"])
        group_memberships = await db.group_members.find({"user_id": user_id}).to_list(200)
        for m in group_memberships:
            manager.subscribe(user_id, m["group_id"])

        await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"status": "online", "last_seen": datetime.now(timezone.utc)}})
        await manager.broadcast_all({"type": "presence", "user_id": user_id, "status": "online"})
        await websocket.send_json({"type": "connected", "user_id": user_id, "online_users": manager.online_users()})

        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")
            if msg_type == "typing_start":
                room_id = data.get("room_id")
                if room_id:
                    u_doc = await db.users.find_one({"_id": ObjectId(user_id)}, {"display_name": 1, "username": 1})
                    uname = (u_doc.get("display_name") or u_doc.get("username", "")) if u_doc else "User"
                    await manager.broadcast_room(room_id, {"type": "typing", "room_id": room_id, "user_id": user_id, "username": uname, "is_typing": True}, exclude=user_id)
            elif msg_type == "typing_stop":
                room_id = data.get("room_id")
                if room_id:
                    await manager.broadcast_room(room_id, {"type": "typing", "room_id": room_id, "user_id": user_id, "is_typing": False}, exclude=user_id)
            elif msg_type == "subscribe_room":
                room_id = data.get("room_id")
                if room_id:
                    manager.subscribe(user_id, room_id)
            elif msg_type == "presence_update":
                status = data.get("status", "online")
                await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"status": status}})
                await manager.broadcast_all({"type": "presence", "user_id": user_id, "status": status})

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"WS error for {user_id}: {e}")
    finally:
        if user_id:
            manager.disconnect(user_id, websocket)
            manager.unsubscribe_all(user_id)
            if not manager.is_online(user_id):
                await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"status": "offline", "last_seen": datetime.now(timezone.utc)}})
                await manager.broadcast_all({"type": "presence", "user_id": user_id, "status": "offline"})


# ======================== APP SETUP ========================
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        FRONTEND_URL,
        "http://localhost:3000",
        "https://parlance-dev.preview.emergentagent.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown():
    client.close()
