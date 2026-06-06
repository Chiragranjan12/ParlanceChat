# ParlanceChat — Complete Interview Preparation Guide

---

## What Is This Project?

ParlanceChat is a full-stack, real-time chat application — think a simplified version of Slack or Discord. Users can register, log in, and communicate through three different conversation types: public/private channels, invite-only group chats, and one-on-one direct messages. Everything is delivered in real time using WebSockets so messages, typing indicators, emoji reactions, and online presence all update instantly without refreshing the page.

---

## The Full Architecture — How It All Connects

```
React Frontend  (Vercel)
      |
      |  REST API calls with Authorization: Bearer token
      |  WebSocket connection with token in query string
      v
Spring Boot Backend  (Render)
      |
      |  Spring Data JPA / Hibernate
      v
PostgreSQL Database  (Render)
```

There is also an optional Python FastAPI proxy in the `backend/` folder. It was intended as a deployment wrapper that could start the Spring Boot JAR and proxy traffic to it. It is not actively used in production — the frontend talks directly to Spring Boot.

---

## Tech Stack — What Was Used and Why

### Backend

**Java 17 + Spring Boot 3.2.3**
Spring Boot was chosen because it gives you a production-ready server with almost no boilerplate. It handles dependency injection, HTTP routing, security filters, database transactions, and WebSocket lifecycle all through annotations. Java 17 specifically brings records, sealed classes, and modern switch expressions, though this project primarily benefits from the LTS stability and the Spring Boot 3 compatibility requirement.

**Spring Web (REST)**
Provides `@RestController`, `@GetMapping`, `@PostMapping` etc. Every API endpoint is a method in a controller class. Spring automatically serializes return values to JSON using Jackson.

**Spring Security**
Manages the entire authentication filter chain. Every incoming request passes through `JwtAuthFilter` before reaching any controller. Spring Security is configured as stateless (no sessions) — each request must carry its own token. Public endpoints like `/api/auth/login` and `/api/auth/register` are whitelisted with `permitAll()`.

**Spring Data JPA + Hibernate**
Provides the repository layer. Instead of writing SQL, you define interfaces like `UserRepository extends JpaRepository<User, String>` and Spring generates the implementation. Hibernate is the ORM underneath — it maps Java entity classes to database tables. `ddl-auto=update` means Hibernate automatically creates or alters tables on startup to match your entity definitions.

**Spring WebSocket**
Provides the `TextWebSocketHandler` base class. This project uses raw (native) WebSockets, not STOMP/SockJS. The `ChatWebSocketHandler` manages all connections in memory using `ConcurrentHashMap` — thread-safe maps that store userId-to-sessions and roomId-to-userIds.

**JJWT 0.12.3**
Library for creating and validating JSON Web Tokens. The app generates two token types: access tokens (24 hour expiry, used for API auth) and refresh tokens (7 day expiry, used to get new access tokens). Tokens are signed with HMAC-SHA384. The secret key is loaded from an environment variable, never hardcoded.

**BCrypt**
Password hashing algorithm. When a user registers, their password is hashed with BCrypt before storing. On login, BCrypt's `matches()` function compares the raw password against the stored hash. BCrypt is intentionally slow to make brute-force attacks expensive.

**Lombok**
Annotation processor that generates boilerplate at compile time. `@Data` generates getters/setters/equals/hashCode, `@Builder` generates a builder pattern, `@RequiredArgsConstructor` generates a constructor for all `final` fields. This keeps entity and DTO classes concise.

**PostgreSQL**
The relational database. Chosen because it handles concurrent writes well, supports UUID primary keys natively, and has excellent support in the Java ecosystem through the official JDBC driver.

**Jackson**
JSON serialization library. Configured with `SNAKE_CASE` naming strategy so Java camelCase fields like `accessToken` are serialized as `access_token` in JSON responses. Also configured to serialize `Instant` as ISO-8601 strings, not timestamps.

**Jakarta Validation**
`@NotBlank`, `@Email`, `@Size`, `@NotEmpty` annotations on DTO fields. When a controller method has `@Valid` on a `@RequestBody`, Spring automatically validates the incoming JSON and returns a 400 with field-level error details if validation fails.

---

### Frontend

**React 18**
Component-based UI library. The app uses functional components with hooks throughout. React 18 brings concurrent rendering features, though this project mainly benefits from the stable hooks API (`useState`, `useEffect`, `useRef`, `useCallback`, `useContext`).

**React Router v7**
Client-side routing. The app has four routes: `/login`, `/signup`, `/settings`, and `/*` (the main chat layout). Protected routes check `useAuth()` before rendering — unauthenticated users are redirected to `/login`.

**Context API (AuthContext + ChatContext)**
Global state management without any external library. `AuthContext` holds the logged-in user and auth functions. `ChatContext` holds all chat state: channels, groups, DM list, messages, typing users, online users, and the WebSocket connection. Components anywhere in the tree can call `useAuth()` or `useChat()` to access this state.

**Axios**
HTTP client for REST API calls. Every request includes an `Authorization: Bearer <token>` header by reading `parlance_token` from localStorage. This approach was chosen over cookies because the frontend and backend are on different domains (Vercel vs Render) and cross-origin cookies are blocked by browsers unless `SameSite=None; Secure` is set — which requires HTTPS on both sides and still has browser inconsistencies.

**Native WebSocket API**
The browser's built-in `WebSocket` constructor. No library needed. The connection is opened as `ws://host/api/ws?token=<jwt>` passing the token in the query string because WebSocket connections cannot set custom headers. The `ChatWebSocketHandler` on the backend validates this token on connection establishment.

**Tailwind CSS**
Utility-first CSS framework. Instead of writing CSS files, you apply classes directly in JSX like `className="flex items-center gap-2 text-white"`. This keeps styling co-located with markup and eliminates CSS naming conflicts. The app uses a custom dark-mode color palette defined in `tailwind.config.js`.

**Framer Motion**
Animation library for React. Used for smooth entrance/exit animations on modals, message items, sidebars, and the member add panel. `AnimatePresence` handles unmount animations (elements that are being removed from the DOM can still animate out).

**Radix UI**
Unstyled, accessible component primitives. The `ui/` folder contains components like Dialog, AlertDialog, DropdownMenu, Tabs, etc. built on top of Radix. These handle keyboard navigation, ARIA attributes, and focus management correctly out of the box.

**Lucide React**
Icon library. Every icon in the UI (Hash, Users, MessageSquare, Plus, Search, etc.) comes from Lucide. It uses SVG icons as React components.

**React Hot Toast**
Notification library. Provides the small toast messages that appear in the top-right corner for success/error feedback (e.g., "Member added", "Failed to send message").

**CRACO**
Create React App Configuration Override. Lets you customize the webpack config without ejecting from CRA. Used here to enable the `@/` path alias so imports like `import { useAuth } from "@/contexts/AuthContext"` work instead of relative paths.

**date-fns**
Date utility library. Used in `dateUtils.js` for formatting message timestamps — showing "2:34 PM" for today's messages and relative dates like "Yesterday" for older ones.

---

## Database Schema — Every Table Explained

**users**
Stores registered users. Primary key is a UUID generated by Hibernate's `@UuidGenerator`. `password_hash` is annotated `@JsonIgnore` so it never appears in API responses. `status` is "online" or "offline", updated by the WebSocket handler when users connect/disconnect.

**messages**
Single table for all message types. The `room_type` column is "channel", "group", or "dm". The `room_id` column is either a channel UUID, group UUID, or a deterministic string like `dm_uuid1_uuid2` (the two user IDs sorted alphabetically and joined). `is_deleted` is a soft delete flag — the content is replaced with "This message was deleted" but the row stays in the database. `reply_to` stores the ID of another message if this is a reply.

**channels**
`channel_type` is "public", "private", or "broadcast". Broadcast channels only allow admins to post.

**channel_members**
Join table between users and channels. Stores `role` ("admin" or "member") and `joined_at`.

**groups_table** (named `groups_table` to avoid conflict with SQL reserved word `GROUP`)
Similar to channels but invite-only. Has `is_active` for soft delete.

**group_members**
Join table between users and groups. Also has `is_active` for soft delete when a user is removed or leaves. Uses a Java enum `GroupRole` with values `ADMIN` and `MEMBER`.

**reactions**
Each row is one user's reaction to one message with one emoji. Toggling a reaction either inserts a new row or deletes the existing one.

**login_attempts**
Rate limiting table. Key is `clientIp:email`. Stores `count` and `last_attempt`. After 5 failed attempts within 15 minutes, the account is temporarily locked.

---

## Authentication Flow — Step by Step

**Registration:**
1. User submits email, username, password, displayName
2. Backend validates with `@Valid` — email format, password length 8-128, username 3-30 alphanumeric
3. Checks for duplicate email and username
4. BCrypt hashes the password
5. Saves user to database
6. Generates access token (24h) and refresh token (7d) with JJWT
7. Returns `{ user, access_token }` in the response body
8. Frontend saves `access_token` to localStorage as `parlance_token`

**Login:**
Same flow but instead of creating a user, it looks up by email, verifies password with `BCrypt.matches()`, checks login attempt count, then returns the same response shape.

**Subsequent Requests:**
Every axios call reads `parlance_token` from localStorage and sends `Authorization: Bearer <token>`. The `JwtAuthFilter` intercepts every request, validates the token signature and expiry, extracts the userId, loads the User entity from the database, and puts it into Spring Security's `SecurityContext`. Controllers receive the authenticated user via `@AuthenticationPrincipal User user`.

**WebSocket Auth:**
The WebSocket connection is opened as `/api/ws?token=<jwt>`. The `ChatWebSocketHandler.afterConnectionEstablished()` reads the token from the query string, validates it, and registers the session. WebSocket connections cannot send custom headers, so the query string approach is standard.

**Token Refresh:**
`POST /api/auth/refresh` reads the `refresh_token` from the HTTP-only cookie (set during login/register), validates it, and returns a new access token. The frontend calls this on `checkAuth()` at app startup to refresh the localStorage token for WebSocket use.

---

## Real-Time System — How WebSockets Work

The `ChatWebSocketHandler` maintains three in-memory data structures:

```
connections:  userId  → List<WebSocketSession>   (supports multiple tabs)
roomUsers:    roomId  → Set<userId>               (who is in each room)
sessionUser:  sessionId → userId                  (reverse lookup)
```

**On connect:** User's sessions are registered, all their channel and group memberships are loaded and subscribed in `roomUsers`, their status is set to online, and a presence broadcast goes out to all connected clients.

**Message flow:** When a user sends a message via `POST /api/messages`, the `MessageService` saves it to the database, enriches it (adds sender info, reactions, reply preview), then calls `wsHandler.broadcastToRoom(roomId, payload)`. This iterates `roomUsers[roomId]`, finds each user's WebSocket sessions in `connections`, and sends the JSON payload to every open session. The sender does NOT get their own message via WebSocket (excluded) — they see it from the HTTP response that the frontend uses to optimistically add it.

Actually looking at the code — the sender IS included in the broadcast from `broadcastToRoom` (no exclusion on message send). The frontend deduplicates by checking if a message ID already exists before adding it to state.

**Typing indicators:** The client sends `{"type":"typing_start","room_id":"..."}` over WebSocket. The backend broadcasts this to all other room members. The frontend sets a 3.5-second auto-clear timeout per user per room — if no `typing_stop` arrives, the indicator disappears automatically.

**Presence:** When a user disconnects and has no remaining sessions (all tabs closed), status is set to offline and a presence broadcast goes out. Other clients update their `onlineUsers` Set in React state, which re-renders online status dots throughout the UI.

---

## What the UI Shows — Every Screen

**Login Page (`/login`)**
Split layout: decorative photo panel on the left, form on the right. Email + password fields, show/hide password toggle, error message display, link to signup.

**Signup Page (`/signup`)**
Same layout. Email, username, display name (optional), password fields. Client-side password length validation before hitting the API.

**Chat Layout (`/` and `/*`)**
Three-column layout:
- Left: Sidebar (260px fixed width)
- Center: Chat view (flexible)
- Right: Members panel (272px, hidden for DMs, collapsible)

**Sidebar:**
- Parlance logo and app name
- Settings button (navigates to `/settings`)
- Channels section with collapse toggle and `+` button to create channel
- Groups section with collapse toggle and `+` button to create group
- Direct Messages section with collapse toggle and `+` button to open New DM modal
- Each DM shows avatar with online status dot and last message preview
- Current user info footer with logout button

**Chat View (center):**
- Header with room name, description, search button, members toggle button
- Collapsible search bar that filters messages client-side by text content
- Messages list with grouping — consecutive messages from the same user within 5 minutes are grouped (avatar shown only on first, timestamp shown on hover for subsequent)
- Hover actions on each message: emoji reaction picker, reply, edit (own messages only), delete (own messages only)
- Reply preview — shows a quoted excerpt above the message content
- Emoji reactions displayed as pill buttons below messages, click to toggle
- Edited indicator "(edited)" shown next to timestamp
- Deleted messages show italic placeholder text
- Typing indicator at the bottom showing who is typing
- Message input with reply-to preview, send on Enter, new line on Shift+Enter
- Loading skeleton animation while messages are fetching

**Members Panel (right):**
- Members count in header
- `+` button opens an inline search to add a new member (search-only, no pre-load)
- Members split into Online and Offline sections
- Each member shows avatar, online status dot, display name, username, crown icon for admins

**Settings Page (`/settings`)**
- Profile tab: display name, bio, avatar URL fields with save button
- Appearance tab: dark/light mode toggle (persisted to localStorage)
- Notifications tab: placeholder toggles
- Privacy tab: shows account info

**Modals:**
- Create Channel: name (auto-lowercased, spaces to hyphens), description, public/private type selector
- Create Group: group name, member search (search-only, type to find), selected members shown as chips
- New DM: user search (search-only, type to find), click to open conversation

---

## Key Design Decisions — Be Ready to Explain These

**Why Authorization header instead of cookies for API auth?**
The frontend is on Vercel (`parlance-chat.vercel.app`) and the backend is on Render (`parlancechat.onrender.com`). These are different domains. Browsers block cross-origin cookies by default (SameSite=Lax). While `SameSite=None; Secure` can override this, it requires HTTPS on both sides, the cookies must be set correctly on every response, and it's fragile across browser updates. Using `Authorization: Bearer <token>` with localStorage is simpler, works universally across domains, and is the standard for SPAs consuming REST APIs.

**Why native WebSocket instead of STOMP/SockJS?**
STOMP is a messaging protocol on top of WebSocket that adds features like topics, acknowledgments, and connection fallback to HTTP polling (via SockJS). For this project, native WebSocket is sufficient — the message volume is low, the connection is direct, and it avoids adding Spring's messaging broker (`@EnableMessageBroker`, `RabbitMQ`, etc.) which would be over-engineering for a personal project. The tradeoff is you have to implement reconnection logic manually, which is done in `ChatContext` with exponential backoff.

**Why a single `messages` table for all room types?**
A `room_type` + `room_id` composite key means you can query any conversation type with the same method: `messageRepository.findByRoomIdDesc(roomId, pageable)`. You don't need separate tables for channel messages, group messages, and DM messages. The tradeoff is you can't enforce foreign key constraints on `room_id` since it points to different tables depending on `room_type`.

**Why SNAKE_CASE Jackson naming strategy?**
Consistency between the database column names (snake_case by SQL convention) and the JSON API (snake_case by REST convention). Java field names are camelCase internally, but the outward-facing API uses snake_case. This is a global setting so it applies to all serialization automatically.

**Why soft delete for messages and groups?**
Soft delete means setting `is_deleted = true` or `is_active = false` rather than actually removing the row. This preserves message history, maintains referential integrity (reply_to references are never broken), and makes it possible to add audit logs or message recovery later. The tradeoff is the database grows over time and queries need to filter deleted records.

**Why in-memory WebSocket state instead of Redis?**
`ConcurrentHashMap` in the JVM is fast and requires no external infrastructure. The limitation is this only works for a single server instance. If you deploy multiple Spring Boot instances behind a load balancer, each instance has its own `connections` map and a user connected to instance A won't receive messages from a user connected to instance B. Redis Pub/Sub would solve this. It's listed as a future enhancement.

**Why UUID primary keys instead of auto-increment integers?**
UUIDs can be generated on the client side without a database roundtrip, they don't leak record counts (you can't tell you're user #5 vs user #5000), and they work safely across distributed systems if you ever shard the database.

---

## What Should Have Been Done Differently (Future Enhancements)

**These are things you didn't build yet. Be honest about them:**

**Redis for presence and WebSocket state**
Currently the WebSocket connection map is in JVM memory. This breaks horizontal scaling. Redis Pub/Sub or Redis Streams would allow multiple backend instances to share state.

**Database migrations with Flyway or Liquibase**
`ddl-auto=update` is fine for development but dangerous in production — it can't drop columns, rename them, or handle complex migrations. A proper migration tool gives you versioned SQL scripts with rollback capability.

**Cursor-based pagination**
Messages are loaded with a simple `LIMIT 50`. As a channel grows to thousands of messages, the user needs infinite scroll — load more messages as they scroll up. This requires a cursor (the ID of the oldest loaded message) to fetch the next page.

**Full-text search**
The current message search is client-side — it filters already-loaded messages by text. Real search would index messages in PostgreSQL using `tsvector` / `tsquery` or an external service like Elasticsearch.

**Email verification and password reset**
There is no email verification on signup. Any email address can be used. A production app would send a verification link. Password reset via email also doesn't exist.

**Read receipts**
No tracking of which messages a user has read. A `message_reads` table with `message_id`, `user_id`, `read_at` would enable this.

**File uploads**
No image or file sharing. Would require either a direct-upload flow to S3/Cloudinary with signed URLs, or a multipart upload endpoint on the backend.

**Push notifications**
No browser push notifications when the app is in the background. Would require a service worker and a push notification service.

**Rate limiting on API endpoints**
Login attempts are rate-limited but other endpoints have no rate limiting. A user could spam the messages endpoint. Spring's filter chain could add a `RateLimitFilter` using a token bucket algorithm.

**Refresh token rotation**
Currently refresh tokens don't rotate — the same refresh token works until it expires (7 days). Proper implementation would issue a new refresh token on every use and invalidate the old one, preventing token theft.

**End-to-end encryption**
Messages are stored in plaintext in the database. E2E encryption would mean the server never sees the plaintext, but it significantly complicates features like search and moderation.

---

## Global Exception Handling — How Errors Work

All exceptions are caught in `GlobalExceptionHandler.java` which is annotated with `@ControllerAdvice` — meaning it intercepts exceptions thrown from any controller across the entire application.

Every error response has the same JSON shape:
```json
{
  "code": "validation_error",
  "message": "Validation failed",
  "details": { "email": "Email must be a valid email address" },
  "timestamp": 1705315245123
}
```

How each exception maps to an HTTP status:

| Exception | HTTP Status | Error Code |
|---|---|---|
| `MethodArgumentNotValidException` | 400 | `validation_error` |
| `UserNotFoundException` | 401 | `user_not_found` |
| `InvalidPasswordException` | 401 | `invalid_password` |
| `InvalidTokenException` | 401 | `invalid_token` |
| `UnauthorizedException` | 401 | `unauthorized` |
| `UserNotMemberException` | 403 | `forbidden` |
| `MessageNotFoundException` | 404 | `not_found` |
| `ChannelNotFoundException` | 404 | `not_found` |
| `GroupNotFoundException` | 404 | `not_found` |
| `DuplicateUserException` | 409 | `conflict` |
| `TooManyRequestsException` | 429 | `too_many_requests` |
| Any other `Exception` | 500 | `internal_error` |

Important security detail: `UserNotFoundException` and `InvalidPasswordException` both return 401 with the same message "Invalid email or password" — this prevents user enumeration attacks where an attacker could tell from the error whether an email is registered or not.

---

## Complete API Reference

### Auth — `/api/auth`
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/register` | No | Register new user, returns `{ user, access_token }` |
| POST | `/login` | No | Login, returns `{ user, access_token }` |
| POST | `/logout` | Yes | Sets status offline, clears cookies |
| GET | `/me` | Yes | Returns authenticated user object |
| POST | `/refresh` | Cookie | Reads refresh_token cookie, returns new access token |

### Channels — `/api/channels`
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | Yes | All channels with `is_member` flag |
| GET | `/mine` | Yes | Only channels user has joined |
| POST | `/` | Yes | Create channel |
| POST | `/{id}/join` | Yes | Self-join a channel |
| DELETE | `/{id}/leave` | Yes | Leave a channel |
| GET | `/{id}/members` | Yes | List members |
| POST | `/{id}/members` | Yes | Add a member (admin) |
| GET | `/{id}/messages` | Yes | Get messages (limit param, default 50) |

### Groups — `/api/groups`
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | Yes | User's groups |
| POST | `/` | Yes | Create group with `member_ids` |
| GET | `/{id}` | Yes | Group details |
| PUT | `/{id}` | Yes | Update name/description (admin only) |
| DELETE | `/{id}` | Yes | Soft delete group (admin only) |
| GET | `/{id}/members` | Yes | List members |
| POST | `/{id}/members` | Yes | Add member (admin only) |
| DELETE | `/{id}/members/{memberId}` | Yes | Remove member (admin only) |
| POST | `/{id}/leave` | Yes | Leave group |
| GET | `/{id}/messages` | Yes | Get messages |

### Messages — `/api/messages`
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/messages` | Yes | Send channel or group message |
| PUT | `/messages/{id}` | Yes | Edit own message |
| DELETE | `/messages/{id}` | Yes | Soft delete own message |
| POST | `/messages/{id}/reactions` | Yes | Toggle emoji reaction |

### Direct Messages — `/api/dm`
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/list` | Yes | All DM conversations with last message preview |
| GET | `/{otherUserId}/messages` | Yes | Message history with a user |
| POST | `/` | Yes | Send a DM |

### Users — `/api/users`
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | Yes | Search users by `?q=` or all users if blank |
| GET | `/search?query=` | Yes | Search users by query |
| GET | `/all` | Yes | All users except self |
| GET | `/me` | Yes | Current user |
| PUT | `/me` | Yes | Update display name, bio, avatar URL |
| GET | `/{userId}` | Yes | Get any user by ID |

### Presence & Health — `/api`
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/presence` | Yes | List of online user IDs |
| PUT | `/presence/status` | Yes | Broadcast a status change |
| GET | `/health` | No | Health check, returns `{ status: "ok" }` |

---

## WebSocket Events Reference

### Client → Server (messages the frontend sends)
```json
{ "type": "subscribe_room", "room_id": "<roomId>" }
{ "type": "typing_start", "room_id": "<roomId>" }
{ "type": "typing_stop", "room_id": "<roomId>" }
{ "type": "presence_update", "status": "away" }
```

### Server → Client (events the frontend receives)
```json
{ "type": "connected", "user_id": "...", "online_users": ["id1", "id2"] }
{ "type": "message", "data": { ...MessageDto } }
{ "type": "message_edited", "data": { ...MessageDto } }
{ "type": "message_deleted", "message_id": "...", "room_id": "..." }
{ "type": "reaction", "message_id": "...", "emoji": "👍", "user_id": "...", "action": "add" }
{ "type": "typing", "room_id": "...", "user_id": "...", "username": "...", "is_typing": true }
{ "type": "presence", "user_id": "...", "status": "online" }
{ "type": "member_joined", "user_id": "...", "timestamp": 1234567890 }
{ "type": "member_removed", "user_id": "...", "timestamp": 1234567890 }
{ "type": "member_left", "user_id": "...", "timestamp": 1234567890 }
{ "type": "group_deleted", "group_id": "...", "timestamp": 1234567890 }
```

---

## Docker Setup

The Spring Boot backend has a `Dockerfile` using a multi-stage build:

**Stage 1 — Build:**
- Base image: `maven:3.9-eclipse-temurin-17`
- Copies `pom.xml` first and runs `mvn dependency:go-offline` — this caches Maven dependencies as a separate Docker layer so rebuilds are fast (dependencies only re-download if `pom.xml` changes)
- Then copies source and runs `mvn clean package -DskipTests`

**Stage 2 — Runtime:**
- Base image: `eclipse-temurin:17-jre-jammy` — JRE only, not JDK, much smaller image
- Installs `curl` for the health check
- Copies only the JAR from the build stage — the Maven toolchain and source code are not in the final image
- `HEALTHCHECK` hits `/api/health` every 30 seconds, marks the container unhealthy after 3 failures
- `ENTRYPOINT ["java", "-jar", "app.jar"]`

The multi-stage build means the final image is much smaller than if you built in a single stage because it doesn't include Maven, the JDK, or build artifacts.

---

## MessageInput Component — Typing Indicator Detail

This is a good component to explain because it shows several frontend patterns working together:

- The textarea **auto-resizes** as the user types by setting `height: auto` then `height: scrollHeight` capped at 120px
- Typing events are **debounced** — `typing_start` is sent only once when the user begins typing (not on every keystroke). A 2-second timer runs; if no new keystrokes arrive, `typing_stop` is sent automatically
- `isTypingRef` is a `useRef` (not `useState`) because changing it should not trigger a re-render — it's just a flag
- Room changes reset the content and height via `useEffect([activeRoom?.id])`
- Enter sends the message, Shift+Enter adds a new line
- The send button is disabled while `isSending` is true to prevent double-sends

---

## ConnectionStatus Component

A small floating banner that appears at the bottom center of the screen whenever `wsConnected` is false. It shows a spinning loader and "Reconnecting..." text. It uses `AnimatePresence` to animate in from below and animate out when the connection is restored. This gives users clear feedback during network interruptions without being intrusive.

---

## Security Considerations — What Was Done

1. **Passwords never stored in plaintext** — BCrypt hash with adaptive cost factor
2. **JWT secret from environment variable** — never committed to source code
3. **`@JsonIgnore` on `passwordHash`** — can never appear in any API response
4. **Role field also `@JsonIgnore`** — internal roles not exposed to clients
5. **User enumeration prevention** — both wrong email and wrong password return identical 401 with identical message
6. **Login throttling** — 5 failed attempts locks the IP+email combo for 15 minutes
7. **Membership checks** — every message read/send verifies the user is a member of that room
8. **Ownership checks** — edit and delete verify the requesting user is the message sender
9. **Broadcast channel protection** — only admins can post in broadcast-type channels
10. **CSRF not needed** — stateless JWT auth with Authorization header is immune to CSRF (CSRF exploits rely on cookies being sent automatically by the browser)
11. **CORS explicitly configured** — only specific origins are allowed, not wildcard
12. **WebSocket origin policy** — `setAllowedOrigins("*")` in WebSocketConfig (this is a known tradeoff — WebSocket CORS is less of a security concern than HTTP CORS because WebSocket connections require a prior HTTP upgrade which is subject to CORS)

---

## Common Interview Questions and Answers

**Q: How does real-time messaging work?**
When a user sends a message, the frontend posts to `POST /api/messages`. The backend saves it to PostgreSQL, enriches it with sender and reaction data, then calls `wsHandler.broadcastToRoom()` which sends the JSON payload to all WebSocket sessions subscribed to that room. Connected clients receive it through their `onmessage` handler, which calls `handleWSMessage` in `ChatContext` and updates the React state. React re-renders the messages list with the new message.

**Q: How do you handle authentication?**
JWT-based stateless auth. On login, the server generates an access token (signed with HMAC-SHA384, 24h expiry) and returns it in the response body. The frontend stores it in localStorage. Every subsequent API request includes it as `Authorization: Bearer <token>`. The `JwtAuthFilter` intercepts every request, validates the signature and expiry, loads the user from the database, and sets the Spring Security authentication context. Controllers receive the authenticated user via `@AuthenticationPrincipal`.

**Q: How do you prevent unauthorized access to messages?**
Before loading or sending messages, the backend checks membership. For channels, it checks `channelMemberRepository.existsByChannelIdAndUserId()`. For groups, `groupMemberRepository.existsByGroupIdAndUserId()`. If the user is not a member, it throws `UserNotMemberException` which the global exception handler maps to a 403 response.

**Q: What is the difference between a channel, group, and DM?**
Channels are public or private spaces anyone can browse and join (public) or be added to (private). Groups are invite-only conversations where the creator chooses members upfront and can add/remove members later. DMs are one-to-one conversations — they don't have a dedicated room entity, the room ID is just `dm_<userId1>_<userId2>` (sorted alphabetically to be deterministic regardless of who initiates).

**Q: How do you handle typing indicators?**
The client sends `{"type":"typing_start","room_id":"..."}` over WebSocket when the user starts typing. The backend broadcasts this to all other room members. On the receiving end, `ChatContext` stores `typingUsers[roomId][userId] = username` and sets a 3.5-second timeout to auto-clear it if no `typing_stop` arrives. The `TypingIndicator` component reads this state and renders "Alice is typing..." etc.

**Q: How do you handle the case where a user has multiple browser tabs open?**
The `connections` map stores `userId → List<WebSocketSession>`. When a message needs to be sent to a user, `sendToUser()` iterates all their sessions and sends to each one. When a tab is closed, that session is removed from the list. Only when the list is empty is the user considered offline.

**Q: Why did you use React Context instead of Redux?**
For this project, Redux would be over-engineering. The state shape is simple — two contexts (auth and chat) cover everything. Context with `useReducer` or `useState` is sufficient for a single-user session with this feature set. Redux makes sense when you have complex derived state, time-travel debugging needs, or many components updating the same slice of state concurrently.

**Q: How do you handle CORS?**
`CorsConfig.java` defines a `CorsConfigurationSource` bean that allows specific origins (configured via `app.cors.origins` environment variable), all standard HTTP methods, all headers, and credentials. This bean is injected into the Spring Security filter chain via `cors(cors -> cors.configurationSource(...))`. It's important that CORS is handled at the Spring Security level rather than a separate `@CrossOrigin` annotation because the security filter runs before the controllers.

**Q: What happens if the WebSocket disconnects?**
`ChatContext` implements exponential backoff reconnection. When the WebSocket `onclose` event fires (and the close code is not `4001` which means the token was invalid), it schedules a reconnect with `setTimeout`. The delay doubles on each attempt: 1s, 2s, 4s, 8s, up to a maximum of 30 seconds. If the user's token has expired, the reconnect will fail repeatedly. In a production app you'd check the token expiry before reconnecting and refresh it first.

**Q: What is the DTO pattern and why do you use it?**
DTO stands for Data Transfer Object. Instead of returning JPA entity objects directly from controllers, you create separate classes that represent exactly what the API sends and receives. This matters for three reasons: first, entities often have fields you don't want to expose (like `passwordHash`) — with a DTO you control exactly what goes out. Second, entities are managed by Hibernate and can have lazy-loaded relationships that would trigger N+1 queries if serialized directly. Third, the API contract becomes explicit and separate from the database schema, so you can change one without breaking the other. `UserDto.from(user)` is the mapping method that converts an entity to its DTO.

**Q: What is `@ControllerAdvice` and how does error handling work?**
`@ControllerAdvice` is a Spring annotation that marks a class as a global interceptor for all controllers. Inside it, `@ExceptionHandler(SomeException.class)` methods catch specific exception types thrown anywhere in the application and return a controlled HTTP response. Without this, unhandled exceptions would return Spring's default white-label error page. The `GlobalExceptionHandler` catches 11 different exception types and maps each to the correct HTTP status code and a consistent JSON error body.

**Q: How does the message enrichment work?**
When a message is fetched or sent, `MessageService.enrich()` is called. It takes a raw `Message` entity and builds a `MessageDto` by: loading the sender's user from the database and attaching it as a nested object, loading all reactions for the message and grouping them by emoji with counts and user IDs, and if the message has a `reply_to` ID, loading that original message and building a reply preview with the sender name and content snippet. This means every message the client receives already has all the data it needs to render — no additional requests required.

**Q: How does the DM room ID work?**
DMs don't have a dedicated database table — they're just messages with `room_type = "dm"` and a special `room_id` format. The room ID is generated as `dm_<smallerId>_<largerId>` where the two user UUIDs are sorted alphabetically. Sorting makes it deterministic — whether Alice initiates the conversation with Bob or Bob initiates with Alice, the room ID is always the same string. This is done in `MessageService.generateDMRoomId()`.

**Q: What is the difference between `@GetMapping` and `@RequestMapping`?**
`@RequestMapping` is the base annotation that can specify method, path, headers, and other conditions. `@GetMapping` is a shortcut for `@RequestMapping(method = RequestMethod.GET)`. The controllers use `@RequestMapping` at the class level to define the base path (e.g., `@RequestMapping("/api/channels")`) and then method-specific shortcuts like `@GetMapping`, `@PostMapping`, `@PutMapping`, `@DeleteMapping` on individual methods.

**Q: How does Spring know which controller method to call?**
Spring's `DispatcherServlet` receives every HTTP request and matches it against all registered `@RequestMapping` patterns. It looks at the HTTP method, URL path, request headers, and parameters to find the most specific matching controller method. If no match is found, it returns 404. If the user is not authenticated and the endpoint requires auth, Spring Security intercepts before the dispatcher even reaches the controller.

**Q: What are `ConcurrentHashMap` and `CopyOnWriteArrayList` and why are they used?**
These are thread-safe collections from `java.util.concurrent`. Regular `HashMap` and `ArrayList` are not safe for concurrent reads and writes — if two threads modify them simultaneously you can get data corruption or `ConcurrentModificationException`. In the WebSocket handler, many users can connect and disconnect simultaneously on different threads, so thread-safe collections are essential. `ConcurrentHashMap` allows concurrent reads and segmented writes. `CopyOnWriteArrayList` is used for the list of sessions per user — writes create a new copy of the array, which makes reads extremely fast (no locking) at the cost of slightly slower writes.

---

## Project Structure Summary

```
ParlanceChat/
├── frontend/                   React app (deployed on Vercel)
│   └── src/
│       ├── contexts/           AuthContext.js, ChatContext.js
│       ├── pages/              LoginPage, SignupPage, ChatLayout, SettingsPage
│       ├── components/         ChatView, MessageItem, Sidebar, RightPanel, etc.
│       └── components/modals/  CreateChannelModal, CreateGroupModal, NewDmModal
│
├── springboot/                 Spring Boot app (deployed on Render)
│   └── src/main/java/com/parlance/
│       ├── config/             CorsConfig, SecurityConfig, WebSocketConfig
│       ├── controller/         Auth, Channel, Group, Message, DM, User, Presence
│       ├── dto/                Request/response shapes (AuthDto, GroupDto, etc.)
│       ├── exception/          Custom exceptions + GlobalExceptionHandler
│       ├── model/              JPA entities (User, Message, Channel, Group, etc.)
│       ├── repository/         Spring Data JPA interfaces
│       ├── security/           JwtUtil, JwtAuthFilter, JwtAuthenticationEntryPoint
│       ├── service/            Business logic (AuthService, MessageService, etc.)
│       └── websocket/          ChatWebSocketHandler
│
└── backend/                    Optional Python FastAPI proxy (not used in prod)
```

---

## Numbers to Know

- JWT access token expiry: **24 hours** (86,400,000 ms)
- JWT refresh token expiry: **7 days** (604,800,000 ms)
- Login attempt limit: **5 attempts** per 15 minutes per IP+email combination
- Message fetch limit: **50 messages** per request (capped at 100 max)
- Group member limit: **100 members** per group
- WebSocket reconnect max delay: **30 seconds**
- Typing indicator auto-clear: **3.5 seconds**
- Message grouping window: **5 minutes** (consecutive messages from same user)
- Database connection pool: **10 max**, **5 min idle**

---

## What to Say When Asked "Tell Me About This Project"

"ParlanceChat is a real-time chat application I built full-stack. The backend is Spring Boot with PostgreSQL — it exposes a REST API for CRUD operations and a native WebSocket endpoint for real-time delivery. Authentication is JWT-based with access and refresh tokens. The frontend is React 18 with Tailwind CSS, deployed on Vercel, talking to the Spring Boot backend on Render.

The main technical challenge I solved was the cross-origin authentication problem. The frontend and backend are on different domains in production, so cookies don't work. I switched from cookie-based auth to Authorization headers, storing the JWT in localStorage and sending it with every API request via a helper function. WebSocket authentication was a separate problem — WebSocket connections can't send custom headers, so the token goes in the query string.

The real-time system uses native WebSocket with in-memory state on the server — a ConcurrentHashMap mapping room IDs to sets of connected user IDs. When a message is sent via REST, the service broadcasts it over WebSocket to all subscribed clients. The frontend handles reconnection with exponential backoff.

If I were to improve it, I'd add Redis for WebSocket state to support horizontal scaling, database migrations with Flyway instead of Hibernate's ddl-auto, and cursor-based pagination for message history."
