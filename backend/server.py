"""
Python proxy server — starts Spring Boot JAR on port 8002, then proxies
all HTTP and WebSocket traffic from port 8001 (this process) to port 8002.
"""
from dotenv import load_dotenv
load_dotenv()

import os, subprocess, asyncio, logging, sys, time
from pathlib import Path
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import Response, StreamingResponse
from starlette.middleware.cors import CORSMiddleware
import httpx
import websockets

# ─── Config ──────────────────────────────────────────────────────────────────
SPRING_PORT = 8002
JAR_PATH    = "/app/springboot/target/parlance-0.0.1-SNAPSHOT.jar"
SPRING_URL  = f"http://localhost:{SPRING_PORT}"
SPRING_WS   = f"ws://localhost:{SPRING_PORT}"
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("proxy")

# ─── Start Spring Boot ────────────────────────────────────────────────────────
spring_proc = None

def start_spring():
    global spring_proc
    if not Path(JAR_PATH).exists():
        log.error(f"JAR not found: {JAR_PATH}")
        return
    env = {**os.environ, "SERVER_PORT": str(SPRING_PORT)}
    spring_proc = subprocess.Popen(
        ["java", "-jar", JAR_PATH],
        env=env,
        stdout=open("/var/log/supervisor/spring.out.log", "a"),
        stderr=open("/var/log/supervisor/spring.err.log", "a"),
    )
    log.info(f"Spring Boot started (PID {spring_proc.pid}) on port {SPRING_PORT}")

start_spring()

# ─── Wait for Spring Boot to be ready ────────────────────────────────────────
def wait_for_spring(timeout=120):
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            import urllib.request
            urllib.request.urlopen(f"http://localhost:{SPRING_PORT}/api/auth/me", timeout=2)
            return True
        except Exception:
            time.sleep(2)
    return False

# ─── FastAPI proxy app ────────────────────────────────────────────────────────
app = FastAPI(title="Parlance Proxy")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000",
                   "https://parlance-dev.preview.emergentagent.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Shared async HTTP client
http_client: httpx.AsyncClient = None

@app.on_event("startup")
async def startup():
    global http_client
    http_client = httpx.AsyncClient(timeout=30.0, follow_redirects=False)
    log.info("Proxy startup — waiting for Spring Boot...")
    # Non-blocking wait
    asyncio.create_task(_poll_spring_boot())

async def _poll_spring_boot():
    for _ in range(60):
        try:
            r = await http_client.get(f"{SPRING_URL}/api/auth/me")
            log.info("Spring Boot is ready!")
            return
        except Exception:
            await asyncio.sleep(2)
    log.warning("Spring Boot did not become ready in 120s")

@app.on_event("shutdown")
async def shutdown():
    global http_client, spring_proc
    if http_client:
        await http_client.aclose()
    if spring_proc:
        spring_proc.terminate()

# ─── WebSocket proxy ──────────────────────────────────────────────────────────
@app.websocket("/api/ws")
async def ws_proxy(client_ws: WebSocket):
    token = client_ws.query_params.get("token", "")
    await client_ws.accept()
    target = f"{SPRING_WS}/api/ws?token={token}"
    try:
        async with websockets.connect(target) as server_ws:
            async def c2s():
                try:
                    while True:
                        data = await client_ws.receive_text()
                        await server_ws.send(data)
                except Exception:
                    pass

            async def s2c():
                try:
                    async for msg in server_ws:
                        await client_ws.send_text(msg if isinstance(msg, str) else msg.decode())
                except Exception:
                    pass

            await asyncio.gather(c2s(), s2c())
    except Exception as e:
        log.debug(f"WS proxy closed: {e}")
    finally:
        try:
            await client_ws.close()
        except Exception:
            pass

# ─── HTTP proxy (catch-all) ────────────────────────────────────────────────────
@app.api_route("/{path:path}",
               methods=["GET","POST","PUT","DELETE","PATCH","OPTIONS","HEAD"])
async def http_proxy(request: Request, path: str):
    url  = f"{SPRING_URL}/{path}"
    qs   = request.url.query
    if qs:
        url += f"?{qs}"

    # Strip hop-by-hop headers
    skip = {"host", "transfer-encoding", "connection", "upgrade",
            "keep-alive", "proxy-authorization", "te", "trailers"}
    headers = {k: v for k, v in request.headers.items() if k.lower() not in skip}

    body = await request.body()
    try:
        upstream = await http_client.request(
            method=request.method,
            url=url,
            headers=headers,
            content=body,
        )
    except httpx.ConnectError:
        return Response(
            content=b'{"detail":"Backend starting up, please retry"}',
            status_code=503,
            media_type="application/json",
        )

    resp_headers = {
        k: v for k, v in upstream.headers.items()
        if k.lower() not in {"transfer-encoding", "connection", "content-encoding"}
    }
    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        headers=resp_headers,
        media_type=upstream.headers.get("content-type"),
    )
