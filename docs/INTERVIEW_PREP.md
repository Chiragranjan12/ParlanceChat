# Parlance Interview Preparation Guide

## How To Use This Document

This guide is an interview-ready summary of Parlance, a full-stack real-time chat application. It is grounded in the current repository implementation:

- Frontend: React 18, Create React App/CRACO, Tailwind CSS, React Router, React Context, Axios, native WebSocket, Framer Motion, React Hot Toast, Lucide icons, Radix/shadcn-style UI primitives.
- Backend: Spring Boot 3.2.3, Java 17, Spring Security, Spring Data JPA, PostgreSQL, JWT, BCrypt, native Spring WebSocket handler.
- Supporting backend proxy: a Python/FastAPI proxy exists in `backend/`, but the primary API/WebSocket server is the Spring Boot app in `springboot/`.

Some items from the original preparation prompt, such as OTP verification, STOMP topics, Flyway migrations, file uploads, read receipts, browser push notifications, Zustand, TanStack Query, and Docker/GitHub Actions deployment files, are not present in the current codebase. They are covered as future improvements or recommended production extensions, so you can distinguish between "what I built" and "how I would evolve it."

---

## Section 1: Project Overview And Vision

### 1.1 Project Introduction

Parlance is a real-time chat web application inspired by modern team communication tools. It supports authenticated users, public/private-style channels, invite-style groups, direct messages, live presence, typing indicators, threaded replies through `reply_to`, message editing, soft deletion, reactions, member panels, profile settings, and dark-mode-first responsive UI.

It was built to solve a common collaboration problem: users need a single place to communicate in different contexts. Direct messages are useful for private one-to-one conversations, channels are useful for broad topic-based communication, and groups are useful for smaller invite-based spaces.

Target users include small teams, student groups, developer communities, clubs, and private communities that need lightweight real-time communication.

What makes Parlance unique as a project is that it demonstrates both application-level product thinking and system-level engineering: authenticated REST APIs, WebSocket events, relational persistence, real-time frontend state updates, security filters, responsive UI, and extensibility for production features like notifications, file sharing, and stronger moderation.

### 1.2 Goals And Objectives

Primary goals:

- Build a working full-stack chat product rather than a static UI.
- Support real-time message delivery with WebSockets.
- Support multiple conversation types: channels, groups, and direct messages.
- Implement secure authentication using JWT and BCrypt password hashing.
- Persist users, memberships, messages, and reactions in PostgreSQL.
- Provide a polished chat UI that works on desktop and mobile.

Secondary goals:

- Make the architecture easy to extend.
- Keep backend responsibilities layered: controllers, services, repositories, models, DTOs, security, WebSocket handler.
- Keep frontend responsibilities separated: pages, components, contexts, utilities, UI primitives.
- Demonstrate production awareness around security, performance, deployment, and testing.

Success metrics:

- Users can register/login and stay authenticated.
- Users can create/join channels, create groups, and start DMs.
- Messages appear in real time for connected users.
- Online/offline presence updates are visible.
- Typing indicators appear and clear automatically.
- API failures are handled with user-visible feedback.
- Message history loads quickly using a configurable limit.

### 1.3 Project Scope

Implemented in the current codebase:

- Registration, login, logout, refresh token, current user lookup.
- JWT access and refresh tokens.
- HTTP-only token cookies plus a localStorage access-token copy for WebSocket connection.
- User search and profile update.
- Channels with create, join, leave, member list, and message list.
- Groups with create, member list, and message list.
- Direct messages with deterministic room IDs and DM list.
- Message send, edit, delete, reply preview, and reactions.
- WebSocket connection, room subscription, real-time message events, typing events, and presence events.
- Dark-mode-first responsive React UI.

Not implemented yet:

- OTP/email verification.
- Password reset email flow.
- STOMP protocol.
- Read receipts table and delivery/read status state.
- File upload and attachment storage.
- Browser push notifications and notification preferences persistence.
- End-to-end encryption.
- Full Docker/GitHub Actions/Flyway setup in repository.
- Redis-backed WebSocket fanout for multi-instance scaling.

Phase 1 features are the current implemented features listed above. Future phases should add OTP/password reset, file sharing, read receipts, persistent notifications, upload storage, migration tooling, observability, CI/CD, and horizontal scaling support.

### 1.4 Key Features Summary

Real-time messaging: REST creates/persists messages; WebSocket broadcasts events to room participants.

Multiple chat types: channels, groups, and DMs all share the `messages` table through `room_type` and `room_id`.

User presence: active WebSocket sessions are tracked in memory; users are marked online/offline and presence events are broadcast.

Typing indicators: frontend sends `typing_start` and `typing_stop`; backend rebroadcasts to other room users.

Search functionality: frontend supports in-room client-side message filtering; backend has a repository method for content search that can be exposed as a future endpoint.

File sharing: not implemented yet; the UI copy mentions it, but there is no upload endpoint/table in current code.

User management: profile update, avatar URL, bio, username/display name, user search, online state.

---

## Section 2: Technical Architecture

### 2.1 High-Level Architecture

Text diagram:

```text
Browser React App
  |
  | HTTPS REST with Axios, credentials enabled
  v
Spring Boot REST Controllers
  |
  | Service layer: auth, channels, groups, messages
  v
Spring Data JPA Repositories
  |
  v
PostgreSQL

Browser React App
  |
  | WebSocket ws(s)://host/api/ws?token=<jwt>
  v
ChatWebSocketHandler
  |
  | In-memory session maps and room membership maps
  v
Connected clients receive JSON events
```

The frontend uses REST for durable operations such as login, registration, loading messages, creating rooms, editing messages, deleting messages, and toggling reactions. WebSocket is used for low-latency fanout and ephemeral events such as presence and typing.

Communication protocols:

- REST/HTTP: `/api/auth/*`, `/api/users/*`, `/api/channels/*`, `/api/groups/*`, `/api/dm/*`, `/api/messages/*`.
- Native WebSocket JSON: `/api/ws?token=<access_token>`.
- STOMP is not used in the current codebase.

### 2.2 Frontend Architecture

Top-level hierarchy:

```text
App
  BrowserRouter
    AuthProvider
      Routes
        GuestRoute -> LoginPage / SignupPage
        ProtectedRoute
          ChatProvider
            ChatLayout
              Sidebar
              ChatView
                MessageItem
                MessageInput
                TypingIndicator
              RightPanel
              ConnectionStatus
            SettingsPage
      Toaster
```

State management:

- `AuthContext` stores authenticated user, loading state, and auth actions.
- `ChatContext` stores channels, groups, DM list, active room, messages by room, typing users, online users, WebSocket connection state, and chat actions.

Data flow:

1. User logs in through `LoginPage`.
2. `AuthContext.login()` calls `/api/auth/login`.
3. Backend returns user and access token; cookies are also set.
4. `ChatProvider` starts when the user is authenticated.
5. `ChatContext` opens WebSocket, loads channels/groups/DMs, and updates state from REST and WebSocket events.
6. Components render from context state.

### 2.3 Backend Architecture

The Spring Boot backend follows a layered monolith:

- Controllers expose REST endpoints.
- Services contain business logic and transactional operations.
- Repositories abstract database access through Spring Data JPA.
- Models map to database tables.
- DTOs define request/response shapes and keep API responses separate from entities.
- Security filters validate JWTs and populate `@AuthenticationPrincipal`.
- `ChatWebSocketHandler` manages WebSocket lifecycle and real-time events.

It is not a microservices architecture today; it is a modular monolith. That is a good interview answer: for this project size, a modular monolith avoids distributed-system complexity while keeping boundaries clear enough to extract services later.

### 2.4 Database Architecture

PostgreSQL is configured through Spring Data JPA. Hibernate currently uses `spring.jpa.hibernate.ddl-auto=update`, so schema evolution is automatic during development. For production, Flyway or Liquibase should replace `ddl-auto=update`.

Main tables:

- `users`
- `messages`
- `channels`
- `groups_table`
- `channel_members`
- `group_members`
- `reactions`
- `login_attempts`

The design uses string UUID primary keys generated by Hibernate. Membership tables represent many-to-many relationships between users and channels/groups. Direct messages are represented as messages with `room_type='dm'` and a deterministic `room_id`.

### 2.5 Communication Architecture

REST handles authoritative state changes. WebSocket handles real-time event propagation.

Message send flow:

1. Frontend submits message through REST.
2. Backend validates membership.
3. Backend saves the message.
4. Backend enriches the message with sender/reaction/reply-preview data.
5. Backend broadcasts `{"type":"message","data":...}` through WebSocket.
6. Frontend receives the event and updates `messages[room_id]`.

WebSocket event types:

- Client to server: `subscribe_room`, `typing_start`, `typing_stop`, `presence_update`.
- Server to client: `connected`, `message`, `typing`, `presence`, `message_edited`, `message_deleted`, `reaction`.

---

## Section 3: Technology Stack

### 3.1 Frontend Stack

React 18: chosen for component-based UI, large ecosystem, predictable rendering model, and strong fit for chat UI composition.

JavaScript with path aliases: the app is JavaScript, not TypeScript. TypeScript would be a future improvement for safer DTO and component contracts.

Create React App with CRACO: the app uses `react-scripts` with `@craco/craco`, not Vite. CRACO allows configuration overrides while keeping CRA conventions.

Tailwind CSS: utility-first styling with a dark visual system, responsive classes, and fast iteration.

React Context: current state-management solution for auth and chat state. Zustand is installed but not used in current code.

Axios: used for REST calls with `withCredentials: true`.

Native WebSocket: used instead of STOMP. The client opens `new WebSocket(`${WS_BASE}/api/ws?token=${token}`)`.

React Router: protects guest/authenticated routes and switches pages.

Framer Motion: used for entrance transitions, modal animations, sidebar/right-panel transitions, and message animation.

React Hot Toast: used for feedback on errors and successful actions.

Lucide React: icon system for navigation, actions, settings, and message controls.

Radix/shadcn-style UI primitives: many generated UI components exist under `frontend/src/components/ui`, though the main chat screens use mostly custom Tailwind components.

### 3.2 Backend Stack

Spring Boot 3.2.3: reduces boilerplate, integrates REST, WebSocket, validation, JPA, and security.

Java 17: modern LTS Java version compatible with Spring Boot 3.

Spring Security: stateless JWT auth, BCrypt password hashing, CORS configuration, authentication entry point, and request filtering.

Spring Data JPA: repository abstraction over PostgreSQL.

Spring WebSocket: native `TextWebSocketHandler` for bidirectional messaging.

PostgreSQL: relational store for users, memberships, messages, login attempts, and reactions.

Lombok: reduces boilerplate for model/DTO classes through annotations such as `@Data`, `@Builder`, and `@RequiredArgsConstructor`.

JWT/JJWT: access and refresh token generation/validation.

MapStruct: not present in current dependencies. DTO mapping is currently manual through helper methods like `UserDto.from()`.

Flyway: not present. Recommended for production migrations.

### 3.3 Infrastructure And DevOps

Current repository evidence:

- Frontend can run locally with `npm start`.
- Spring Boot can run locally with Maven.
- PostgreSQL is configured in `application.properties`.
- Python proxy exists in `backend/server.py`.
- `.github/` exists, but this document did not verify full CI/CD workflow contents.
- No Dockerfile or Docker Compose file appears in the current file listing.

Deployment target from the prompt:

- Frontend: Vercel.
- Backend: Stitch.
- Database: PostgreSQL.

Production recommendation:

- Add backend Dockerfile.
- Add frontend build/deploy workflow.
- Add Flyway migrations.
- Add GitHub Actions for lint/test/build.
- Store secrets in platform-managed env vars, not source files.

### 3.4 Development Tools

- Maven builds the Spring Boot backend.
- npm/yarn scripts run the React frontend.
- Git tracks source control.
- Pytest is present for the Python backend tests.
- React tests can run through `craco test`, though current test files were not inspected in depth.

---

## Section 4: Frontend Detailed Breakdown

### 4.1 Project Structure

```text
frontend/
  public/
    index.html
  src/
    App.js
    App.css
    index.js
    index.css
    design-tokens.js
    components/
      ChatView.js
      ConnectionStatus.js
      EmojiPicker.js
      MessageInput.js
      MessageItem.js
      RightPanel.js
      Sidebar.js
      TypingIndicator.js
      UserAvatar.js
      modals/
        CreateChannelModal.js
        CreateGroupModal.js
        NewDmModal.js
      ui/
        shadcn/Radix-style reusable primitives
    contexts/
      AuthContext.js
      ChatContext.js
    hooks/
      use-toast.js
    lib/
      utils.js
    pages/
      ChatLayout.js
      LoginPage.js
      SettingsPage.js
      SignupPage.js
    utils/
      dateUtils.js
```

The structure separates route-level pages, reusable domain components, shared UI primitives, state contexts, and utilities.

### 4.2 Pages

Login page:

- Fields: email, password.
- UI: password visibility toggle, error alert, loading state.
- Flow: submit -> `AuthContext.login()` -> `/api/auth/login` -> store user/token -> navigate home.

Signup page:

- Fields: email, username, optional display name, password.
- Validation: frontend checks password length >= 8.
- Flow: submit -> `/api/auth/register` -> store user/token -> navigate home.
- Current behavior: no OTP; account is created and logged in immediately.

Chat layout:

- Main authenticated app shell.
- Contains sidebar, chat view, right member panel, mobile sidebar overlay, and connection status.
- Auto-selects a `general` channel or first channel when channels load.

Settings page:

- Tabs: profile, appearance, notifications, privacy.
- Profile update persists display name, bio, and avatar URL.
- Appearance toggles dark/light class and stores preference in localStorage.
- Notification/privacy sections are mostly UI placeholders today.

Not implemented as separate pages:

- OTP verification page.
- Password reset page.
- Dedicated search results page.
- Dedicated notifications page.
- Separate channel/group/DM route pages. These are handled within `ChatLayout` and `activeRoom`.

### 4.3 Components

Important implemented components:

- `Sidebar`: channel/group/DM navigation, create buttons, settings, logout, online badges.
- `ChatView`: header, message search filter, member-panel toggle, grouped message list, typing indicator, message input.
- `MessageItem`: renders sender, timestamp, content, edit/delete/reply/reaction actions, reply preview, deleted state.
- `MessageInput`: auto-resizing textarea, send button, emoji picker, reply preview, typing event timer.
- `TypingIndicator`: displays users currently typing.
- `ConnectionStatus`: displays WebSocket connection state.
- `RightPanel`: loads and displays channel/group members separated into online/offline.
- `UserAvatar`: avatar URL or fallback initial.
- `EmojiPicker`: small emoji selector used for messages and composition.
- `CreateChannelModal`: creates public/private channel.
- `CreateGroupModal`: searches users, selects members, creates group.
- `NewDmModal`: searches users and starts/selects a DM.
- `LoginPage` and `SignupPage`: authentication UI.
- `SettingsPage`: profile/theme/settings UI.
- `ProtectedRoute`: blocks unauthenticated access.
- `GuestRoute`: redirects authenticated users away from login/signup.
- UI primitives under `components/ui`: button, dialog, toast, input, textarea, tabs, select, sheet, tooltip, dropdown menu, avatar, badge, skeleton, progress, etc.

### 4.4 State Management

Current state lives in React Context, not Zustand.

`AuthContext`:

- `user`
- `isLoading`
- `login(email, password)`
- `register(email, username, password, displayName)`
- `logout()`
- `updateUser(updates)`
- `checkAuth()`

`ChatContext`:

- `channels`
- `groups`
- `dmList`
- `activeRoom`
- `messages` keyed by room ID
- `typingUsers` keyed by room ID and user ID
- `onlineUsers` as a `Set`
- `wsConnected`
- `isLoadingMessages`
- WebSocket refs and reconnect timers
- Chat actions: load rooms, set active room, send/edit/delete messages, add reaction, send typing event.

If asked about Zustand: it is installed but not used. A strong answer is: "I started with Context because the state was scoped to auth and chat providers. If the app grew, I would migrate chat state to Zustand to reduce provider re-renders and create finer-grained selectors."

### 4.5 API Integration

`AuthContext` defines:

```js
const API = process.env.REACT_APP_BACKEND_URL + "/api";
```

Axios calls include `{ withCredentials: true }` so HTTP-only cookies are sent to the backend.

Auth flow:

- Login/register returns `access_token`.
- Backend also sets HTTP-only `access_token` and `refresh_token` cookies.
- Frontend stores the returned access token in `localStorage` as `parlance_token` because the WebSocket connection passes the token in the query string.

Error handling:

- Login/signup display server `detail` messages when available.
- Chat actions show toasts for common failures.
- Some background loads fail silently to avoid noisy UI.

### 4.6 WebSocket Integration

Initialization:

```js
const ws = new WebSocket(`${WS_BASE}/api/ws?token=${token}`);
```

Lifecycle:

- Connect when authenticated user exists.
- On open: set connected state and reset reconnect attempts.
- On message: parse JSON and dispatch by `msg.type`.
- On close: clear connection, set disconnected, retry with exponential backoff up to 30 seconds.
- On cleanup: close socket and clear reconnect timer.

Subscribe/unsubscribe:

- There is explicit `subscribe_room`.
- There is no unsubscribe event today.
- Backend auto-subscribes connected users to their channel/group rooms at connection time.

Message send:

- Current implementation sends messages through REST, not WebSocket.
- Backend broadcasts resulting message over WebSocket.

Topics:

- No STOMP topics. Rooms are tracked in backend maps keyed by `roomId`.

### 4.7 Feature Implementation

Real-time messaging:

- REST save plus WebSocket broadcast.
- Client deduplicates by message ID before appending.

Typing indicators:

- `MessageInput` sends `typing_start` once typing begins.
- A 2-second client timer sends `typing_stop`.
- Receiver removes typing indicator after 3.5 seconds as a safety timeout.

Read receipts:

- Not implemented. Recommended design: `read_receipts(message_id, user_id, read_at)` and a WebSocket `read_receipt` event.

Presence:

- Backend tracks `userId -> sessions`.
- Online status is derived from active sessions.
- User model `status` and `last_seen` are updated on connection/disconnection.

Message search:

- Current UI filters loaded messages client-side.
- Repository includes `findByContentContainingIgnoreCaseAndIsDeletedFalseOrderByCreatedAtDesc`, which can support a backend search endpoint.

Notifications:

- Toasts exist for user feedback.
- Persistent notification table/browser push are future work.

Offline mode:

- Auto-reconnect exists.
- Message queue while offline is not implemented.

### 4.8 UI/UX Details

Design:

- Dark-mode-first UI using near-black backgrounds, zinc borders, indigo accents, green online indicators, red errors.
- Responsive shell with collapsible mobile sidebar.
- Desktop layout includes persistent sidebar, chat panel, and optional right member panel.
- Message grouping reduces visual repetition by grouping consecutive messages from the same sender within five minutes.

Accessibility:

- Native form controls and buttons are used.
- Some controls include `title` and semantic button usage.
- Future improvements: keyboard focus audit, ARIA labels on icon-only buttons, color contrast verification, reduced-motion support, and screen reader announcement for new messages.

### 4.9 Performance Optimizations

Current:

- Message history loads with `limit=50`.
- Messages are cached in `messages[roomId]` once loaded.
- WebSocket updates only append/update relevant message arrays.
- Message grouping is computed in render for loaded messages.
- Reconnect uses exponential backoff.

Recommended:

- Virtualize large message lists with `react-virtual` or similar.
- Server-side paginated infinite scroll.
- Code splitting route pages.
- Avoid full room scans for reaction updates.
- Add memoization for grouped messages.
- Add bundle analysis and target production bundle budgets.

### 4.10 Frontend Security

Current:

- React escapes rendered text by default, reducing XSS risk.
- No `dangerouslySetInnerHTML` in core message rendering.
- Tokens are stored in HTTP-only cookies for REST auth.
- Access token is also stored in localStorage for WebSocket, which is a tradeoff.
- Forms validate basic required fields and password length.

Recommended:

- Prefer a WebSocket auth mechanism that does not require localStorage token exposure.
- Add CSP headers.
- Add more input length validation on frontend and backend.
- Sanitize/validate avatar URLs.
- Use secure, SameSite cookies in production.

---

## Section 5: Backend Detailed Breakdown

### 5.1 Project Structure

```text
springboot/src/main/java/com/parlance/
  ParlanceApplication.java
  config/
    GlobalExceptionHandler.java
    SecurityConfig.java
    WebSocketConfig.java
  controller/
    AuthController.java
    ChannelController.java
    DmController.java
    GroupController.java
    MessageController.java
    UserController.java
  dto/
    AuthDto.java
    ChannelDto.java
    GroupDto.java
    MessageDto.java
    MessageRequestDto.java
    UserDto.java
  model/
    Channel.java
    ChannelMember.java
    Group.java
    GroupMember.java
    LoginAttempt.java
    Message.java
    Reaction.java
    User.java
  repository/
    ChannelMemberRepository.java
    ChannelRepository.java
    GroupMemberRepository.java
    GroupRepository.java
    LoginAttemptRepository.java
    MessageRepository.java
    ReactionRepository.java
    UserRepository.java
  security/
    JwtAuthFilter.java
    JwtAuthenticationEntryPoint.java
    JwtUtil.java
  service/
    AuthService.java
    ChannelService.java
    GroupService.java
    MessageService.java
    SeedService.java
  websocket/
    ChatWebSocketHandler.java
```

### 5.2 Controllers

`AuthController`:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/refresh`

`UserController`:

- `GET /api/users?q=...`
- `GET /api/users/me`
- `PUT /api/users/me`
- `GET /api/users/{userId}`

`ChannelController`:

- `GET /api/channels`
- `GET /api/channels/mine`
- `POST /api/channels`
- `POST /api/channels/{channelId}/join`
- `DELETE /api/channels/{channelId}/leave`
- `GET /api/channels/{channelId}/members`
- `GET /api/channels/{channelId}/messages?limit=50`

`GroupController`:

- `GET /api/groups`
- `POST /api/groups`
- `GET /api/groups/{groupId}/members`
- `GET /api/groups/{groupId}/messages?limit=50`

`DmController`:

- `GET /api/dm/list`
- `GET /api/dm/{otherUserId}/messages?limit=50`
- `POST /api/dm`

`MessageController`:

- `POST /api/messages`
- `PUT /api/messages/{messageId}`
- `DELETE /api/messages/{messageId}`
- `POST /api/messages/{messageId}/reactions`
- `GET /api/presence`
- `PUT /api/presence/status`

### 5.3 Services

`AuthService`:

- Registers users with normalized email/username.
- Checks duplicate email/username.
- Hashes passwords with BCrypt.
- Generates access/refresh JWTs.
- Sets/clears token cookies.
- Tracks failed login attempts per `IP:email`.
- Refreshes access tokens from refresh-token cookie.

`ChannelService`:

- Lists all channels and user's joined channels.
- Creates normalized channel names.
- Creates creator membership as admin.
- Joins/leaves channels.
- Loads channel members with online status.

`GroupService`:

- Lists groups where user is a member.
- Creates group and member rows.
- Validates membership before exposing members.

`MessageService`:

- Validates channel/group membership before sending.
- Enforces broadcast channel admin-only posting.
- Saves messages.
- Enriches message DTOs with sender, reactions, and reply preview.
- Sends DMs with deterministic room IDs.
- Edits/deletes own messages.
- Toggles reactions.
- Broadcasts message events through `ChatWebSocketHandler`.

`SeedService`:

- Used for seed/default data. It should be discussed as development bootstrap logic.

### 5.4 Repositories

`UserRepository`:

- Find by email/username.
- Existence checks.
- Search by display name or username.

`MessageRepository`:

- Load room messages ascending/descending.
- Find DM room IDs by user.
- Search non-deleted message content.

`ChannelRepository`:

- Channel CRUD plus name existence checks.

`ChannelMemberRepository`:

- Find by user/channel.
- Membership existence checks.
- Count members.
- Delete membership.

`GroupRepository` and `GroupMemberRepository`:

- Group CRUD and membership lookup/existence checks.

`ReactionRepository`:

- Load reactions by message.
- Find unique reaction by message/user/emoji.

`LoginAttemptRepository`:

- Track failed login attempts by identifier.

### 5.5 Entities And DTOs

Entities:

- `User`: account/profile/presence fields.
- `Message`: shared table for channel/group/DM messages.
- `Channel`: named communication room.
- `Group`: invite-style communication room.
- `ChannelMember`: many-to-many channel membership with role.
- `GroupMember`: many-to-many group membership with role.
- `Reaction`: emoji reaction with unique message/user/emoji constraint.
- `LoginAttempt`: failed login counter for rate limiting.

DTO purpose:

- Avoid exposing sensitive fields like `passwordHash`.
- Shape frontend-friendly response names.
- Add computed fields like `memberCount`, `isMember`, `isOnline`, reaction counts, and reply previews.

Mapping:

- Manual mapping today.
- MapStruct could be added later if DTO mapping grows.

### 5.6 Authentication And Security

JWT generation:

- `JwtUtil.generateAccessToken(userId, email)` creates token with subject, email claim, type `access`, issued time, expiry, and HMAC signature.
- `JwtUtil.generateRefreshToken(userId)` creates token with type `refresh`.

JWT validation:

- REST: `JwtAuthFilter` extracts token from `access_token` cookie or `Authorization: Bearer ...` header.
- WebSocket: `ChatWebSocketHandler` extracts token from query string and validates it before accepting session.

Password hashing:

- `BCryptPasswordEncoder` hashes passwords.
- Raw passwords are never stored.

Token refresh:

- `/api/auth/refresh` reads `refresh_token` cookie, validates token type, creates a new access token, and sets a new access cookie.

OTP/password reset:

- Not implemented in current code. Future design requires OTP table, expiry, email service, resend throttling, and reset-token validation.

Authorization:

- Global auth required except register/login/refresh/ws.
- Channel/group message endpoints validate membership.
- Editing/deleting checks message sender ownership.
- Broadcast channel posting checks admin role.

### 5.7 Database Design

See Section 6 for full table-level details. The key design decision is using a generic `messages` table with `room_type` and `room_id` so channels, groups, and DMs can share message logic.

### 5.8 API Endpoints

See Section 7 for endpoint documentation.

### 5.9 WebSocket Implementation

Configuration:

- `WebSocketConfig` registers `ChatWebSocketHandler` at `/api/ws`.
- Allowed origins are set to `*` at the WebSocket handler level; CORS is configured separately for REST.

Session maps:

- `connections`: `userId -> list of sessions`, allowing multiple tabs.
- `roomUsers`: `roomId -> set of userIds`.
- `sessionUserMap`: `sessionId -> userId`.

Connection:

- Validate token.
- Store session.
- Subscribe user to channel/group rooms.
- Mark user online.
- Broadcast presence.
- Send connected event with online user list.

Disconnection:

- Remove session.
- If no sessions remain for user, mark offline and broadcast presence.

### 5.10 Error Handling

`GlobalExceptionHandler` catches `ResponseStatusException` and returns:

```json
{
  "detail": "Error message",
  "status": 400
}
```

Spring Security uses `JwtAuthenticationEntryPoint` for unauthorized access.

### 5.11 Validation

Current:

- Request DTOs use Jakarta validation annotations.
- Frontend validates required fields and password length.
- Services enforce membership and ownership rules.

Recommended:

- Add message length constraints.
- Add username pattern/length constraints.
- Validate channel type with enum.
- Validate avatar URLs and sanitize profile text.
- Add file type/size validation when uploads are added.

### 5.12 Logging And Monitoring

Current:

- `ChatWebSocketHandler` logs WebSocket errors/warnings.
- Application logging levels are configured in `application.properties`.

Recommended:

- Add structured request logging.
- Add Spring Boot Actuator health endpoints.
- Add metrics for active WebSocket sessions, message throughput, error rates, and DB latency.

### 5.13 Performance Optimization

Current:

- Message history limits default to 50.
- Connection pool max size is configured as 10.
- REST endpoints avoid loading all history by default.

Recommended:

- Add database indexes explicitly through migrations.
- Use fetch joins/projections to reduce N+1 enrichment calls.
- Add Redis for distributed presence/fanout.
- Add pagination cursors for message history.

---

## Section 6: Database Schema

### 6.1 Tables

`users`:

- Purpose: stores account, profile, and presence state.
- Columns: `id` UUID string PK, `email` unique non-null, `username` unique non-null, `display_name`, `password_hash` non-null, `avatar_url`, `bio` default empty, `status` default `offline`, `role` default `user`, `created_at`, `last_seen`.
- Why: central identity table used by messages, memberships, reactions, and authentication.

`messages`:

- Purpose: stores all messages for channels, groups, and DMs.
- Columns: `id` PK, `content` text non-null, `sender_id` non-null, `room_type`, `room_id`, `reply_to`, `is_deleted`, `edited_at`, `created_at`.
- Why: one shared table avoids duplicating message logic across chat types.

`channels`:

- Purpose: topic-based rooms.
- Columns: `id` PK, `name` unique non-null, `description`, `channel_type` default `public`, `created_by`, `created_at`.
- Why: channel metadata and access behavior.

`groups_table`:

- Purpose: private/group conversations.
- Columns: `id` PK, `name` non-null, `description`, `created_by`, `created_at`.
- Why: group metadata separate from channels.

`channel_members`:

- Purpose: many-to-many relationship between users and channels.
- Columns: `id` PK, `channel_id` non-null, `user_id` non-null, `role` default `member`, `joined_at`.
- Unique constraint: `(channel_id, user_id)`.
- Why: prevents duplicate membership and stores per-channel role.

`group_members`:

- Purpose: many-to-many relationship between users and groups.
- Columns: `id` PK, `group_id` non-null, `user_id` non-null, `role` default `member`, `joined_at`.
- Unique constraint: `(group_id, user_id)`.

`reactions`:

- Purpose: emoji reactions to messages.
- Columns: `id` PK, `message_id` non-null, `user_id` non-null, `emoji`, `created_at`.
- Unique constraint: `(message_id, user_id, emoji)`.
- Why: a user can toggle a given emoji once per message.

`login_attempts`:

- Purpose: basic login rate limiting.
- Columns: `id` PK, `identifier` unique non-null, `count`, `last_attempt`.
- Identifier format: `clientIp:email`.

Future tables:

- `read_receipts(message_id, user_id, read_at)`.
- `notifications(id, user_id, type, payload, read_at, created_at)`.
- `attachments(id, message_id, file_url, file_name, mime_type, size, uploaded_by, created_at)`.
- `otp_tokens(id, user_id/email, code_hash, purpose, expires_at, used_at)`.
- `blocks(blocker_id, blocked_id, created_at)`.

### 6.2 Relationships

- One user sends many messages.
- One user can belong to many channels through `channel_members`.
- One channel has many users through `channel_members`.
- One user can belong to many groups through `group_members`.
- One group has many users through `group_members`.
- One message can have many reactions.
- One message can reply to another message through `reply_to`.

JPA uses scalar IDs rather than entity relationships for many fields, which simplifies JSON serialization and avoids accidental eager loading. The tradeoff is that service code manually fetches related entities.

### 6.3 Indexes

Hibernate creates indexes/constraints for primary keys and unique columns. For production, explicit migrations should add:

- `messages(room_id, created_at DESC)` for room history.
- `messages(sender_id)` for user activity.
- `messages(room_type, room_id)` for room filtering.
- `messages(content)` full-text or trigram index for search.
- `channel_members(user_id)`.
- `channel_members(channel_id)`.
- `group_members(user_id)`.
- `group_members(group_id)`.
- `reactions(message_id)`.
- `login_attempts(identifier)`.

### 6.4 Sample Queries

Get latest room messages:

```sql
SELECT *
FROM messages
WHERE room_id = :room_id
ORDER BY created_at DESC
LIMIT 50;
```

Get channel members:

```sql
SELECT u.*
FROM users u
JOIN channel_members cm ON cm.user_id = u.id
WHERE cm.channel_id = :channel_id;
```

Get DM conversations for a user:

```sql
SELECT DISTINCT room_id
FROM messages
WHERE room_type = 'dm'
  AND (room_id LIKE CONCAT('dm_', :user_id, '_%')
       OR room_id LIKE CONCAT('dm_%_', :user_id));
```

Search messages:

```sql
SELECT *
FROM messages
WHERE is_deleted = false
  AND LOWER(content) LIKE LOWER(CONCAT('%', :query, '%'))
ORDER BY created_at DESC
LIMIT 50;
```

---

## Section 7: API Documentation

### 7.1 Authentication Endpoints

`POST /api/auth/register`

- Body: `email`, `username`, `password`, optional `display_name`.
- Response: `{ user, access_token }`.
- Status: `201 Created`.
- Errors: `409` duplicate email/username, validation errors.

`POST /api/auth/login`

- Body: `email`, `password`.
- Response: `{ user, access_token }`.
- Side effect: sets access and refresh cookies.
- Errors: `401` invalid credentials, `429` too many failed attempts.

`POST /api/auth/logout`

- Auth required.
- Response: `{ "message": "Logged out" }`.
- Side effect: clears cookies and marks user offline.

`GET /api/auth/me`

- Auth required.
- Response: authenticated user entity.

`POST /api/auth/refresh`

- Reads `refresh_token` cookie.
- Response: `{ "access_token": "..." }`.
- Errors: `401` invalid/missing refresh token.

Not implemented:

- `POST /api/auth/verify-otp`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

### 7.2 User Endpoints

`GET /api/users?q=query`

- Searches users by display name or username.
- Returns up to 50 `UserDto` records with online status.

`GET /api/users/me`

- Returns current authenticated user.

`PUT /api/users/me`

- Body: `display_name`, `bio`, `avatar_url`.
- Updates profile fields.

`GET /api/users/{userId}`

- Returns target user DTO with online status.

### 7.3 Channel Endpoints

`GET /api/channels`

- Returns all channels with member count and current user's membership flag.

`GET /api/channels/mine`

- Returns channels joined by current user.

`POST /api/channels`

- Body: `name`, `description`, `channel_type`.
- Creates channel and makes creator admin.

`POST /api/channels/{channelId}/join`

- Joins current user to channel.

`DELETE /api/channels/{channelId}/leave`

- Removes current user's membership.

`GET /api/channels/{channelId}/members`

- Returns channel members.

`GET /api/channels/{channelId}/messages?limit=50`

- Requires membership.
- Returns recent messages.

### 7.4 Message Endpoints

`POST /api/messages`

- Body: `content`, `room_type`, `room_id`, optional `reply_to`.
- Used for channel/group messages.
- Requires channel/group membership.

`PUT /api/messages/{messageId}`

- Body: `content`.
- Only sender can edit.

`DELETE /api/messages/{messageId}`

- Only sender can delete.
- Soft deletes message.

`POST /api/messages/{messageId}/reactions`

- Body: `emoji`.
- Toggles reaction for current user.

Not exposed but repository-ready:

- `GET /api/messages/search`.

### 7.5 Group Endpoints

`GET /api/groups`

- Returns groups where current user is a member.

`POST /api/groups`

- Body: `name`, `description`, `member_ids`.
- Creates group, creator admin, selected members as members.

`GET /api/groups/{groupId}/members`

- Requires group membership.

`GET /api/groups/{groupId}/messages?limit=50`

- Requires group membership.

Not implemented:

- Group update/delete.
- Invite/remove member endpoints.

### 7.6 Direct Message Endpoints

`GET /api/dm/list`

- Returns DM conversations for current user.

`GET /api/dm/{otherUserId}/messages?limit=50`

- Returns messages in deterministic DM room.

`POST /api/dm`

- Body: `recipient_id`, `content`, optional `reply_to`.
- Creates DM message and sends WebSocket event to sender and recipient.

### 7.7 WebSocket API

Connection:

```text
GET /api/ws?token=<access_token>
```

Client messages:

```json
{ "type": "subscribe_room", "room_id": "room-id" }
```

```json
{ "type": "typing_start", "room_id": "room-id" }
```

```json
{ "type": "typing_stop", "room_id": "room-id" }
```

```json
{ "type": "presence_update", "status": "away" }
```

Server messages:

```json
{ "type": "connected", "user_id": "u1", "online_users": ["u1", "u2"] }
```

```json
{ "type": "message", "data": { "id": "m1", "content": "Hello" } }
```

```json
{ "type": "typing", "room_id": "r1", "user_id": "u2", "username": "Ava", "is_typing": true }
```

```json
{ "type": "presence", "user_id": "u2", "status": "offline" }
```

```json
{ "type": "message_edited", "data": { "id": "m1", "content": "Edited" } }
```

```json
{ "type": "message_deleted", "message_id": "m1", "room_id": "r1" }
```

```json
{ "type": "reaction", "message_id": "m1", "emoji": ":thumbs_up:", "user_id": "u2", "action": "add", "room_id": "r1" }
```

---

## Section 8: Features In Detail

### 8.1 Real-Time Messaging

The frontend posts messages to REST endpoints. The backend persists the message and immediately broadcasts a WebSocket event to room participants. This gives reliable persistence plus live updates.

Message status today is implicit: once REST succeeds and WebSocket broadcasts, the message appears. A production status pipeline would add client IDs and states: pending, sent, delivered, read.

### 8.2 Authentication

Registration:

1. User submits email, username, password, display name.
2. Backend normalizes email/username.
3. Backend checks uniqueness.
4. Backend hashes password with BCrypt.
5. User row is saved.
6. Access and refresh JWTs are generated.
7. Cookies are set and access token is returned.

Login:

1. Backend checks failed-attempt rate limit.
2. User is found by email.
3. Password is verified with BCrypt.
4. Failed attempt record is cleared.
5. Tokens are generated and cookies set.

Logout:

1. User is marked offline.
2. Token cookies are cleared.
3. Frontend clears localStorage token and user state.

### 8.3 Chat Types

Direct messages:

- One-to-one conversation.
- Room ID format: `dm_<lower_sorted_user_id>_<higher_sorted_user_id>`.
- No separate DM table.

Channels:

- Topic-based rooms users can discover and join.
- Creator gets admin membership.
- `broadcast` channel type supports admin-only posting.

Groups:

- Smaller member-selected spaces.
- Creator is admin.
- Membership checked before reading messages or members.

### 8.4 User Presence

Presence is tracked through active WebSocket sessions:

- On connect: add session, mark online, broadcast presence.
- On disconnect: remove session; if no sessions remain, mark offline and update `last_seen`.
- Supports multiple tabs because each user maps to a list of sessions.

### 8.5 Typing Indicators

Frontend:

- Sends `typing_start` when typing begins.
- Sends `typing_stop` after 2 seconds of inactivity or after sending.

Backend:

- Receives typing event and broadcasts to room except sender.

Receiver:

- Shows typing name.
- Clears after stop event or 3.5-second timeout.

### 8.6 Message Reactions

Reactions are stored in `reactions` table with uniqueness on message/user/emoji. Toggling a reaction either inserts or deletes the row. Backend broadcasts a `reaction` event, and frontend updates reaction counts and user lists.

### 8.7 Message Threading

Full nested threads are not implemented. Lightweight replies exist through `reply_to`. When a message references another message, `MessageService.enrich()` adds `reply_preview` with original content and sender name. The UI displays this as a small indented preview.

### 8.8 Read Receipts

Not implemented. Recommended approach:

- Add `read_receipts` table.
- Mark messages read when the room is active and visible.
- Send `read_receipt` WebSocket event.
- Show single/double check or "Read by X" UI.

### 8.9 Notifications

Current notifications:

- Toasts for user actions such as create channel/group, profile save, and failures.
- DM list last-message preview updates when DM message arrives.

Future:

- Persistent notification rows.
- Browser notifications.
- Sound notifications.
- Badge counts.
- DND and preferences.

### 8.10 Search

Current:

- Chat header search filters currently loaded messages in the active room.

Future:

- Expose backend message search endpoint.
- Add filters for sender, room, date range.
- Add PostgreSQL full-text search or trigram indexes.

### 8.11 File Sharing

Not implemented. Recommended flow:

1. Validate file type/size in frontend.
2. Upload multipart file to backend or presigned cloud URL.
3. Store metadata in `attachments`.
4. Create message linked to attachment.
5. Render previews based on MIME type.

### 8.12 Offline Support

Implemented:

- WebSocket reconnect with exponential backoff.
- Existing messages remain in state.

Not implemented:

- Offline message queue.
- Local persistence.
- Conflict handling.

### 8.13 User Management

Implemented:

- Profile fields: display name, bio, avatar URL.
- User search.
- Online status.
- Theme preference.

Future:

- Blocking.
- Favorites.
- Notification/privacy preferences persistence.
- OAuth and two-factor authentication.

---

## Section 9: Security And Authentication

### 9.1 JWT

Access tokens include:

- Subject: user ID.
- Email claim.
- Type: `access`.
- Issued-at and expiration.

Refresh tokens include:

- Subject: user ID.
- Type: `refresh`.
- Longer expiration.

Validation happens in `JwtAuthFilter` for REST and `ChatWebSocketHandler` for WebSocket.

### 9.2 Password Security

Passwords are hashed with BCrypt. BCrypt automatically salts hashes. Passwords are never returned in DTOs; `passwordHash` is annotated with `@JsonIgnore`.

### 9.3 OTP Verification

Not implemented. In an interview, say:

"The current version prioritizes core chat flow and JWT auth. For OTP, I would store hashed OTPs with purpose, expiry, and attempt count; send them by email; rate-limit resend; and mark them used after verification."

### 9.4 Authorization

Implemented:

- Auth required for all endpoints except register/login/refresh/ws.
- Channel and group membership checks before reading/sending.
- Sender ownership checks for edit/delete.
- Broadcast channel admin-only posting.

### 9.5 Data Protection

Current:

- Intended production deployment should use HTTPS/WSS.
- Sensitive password hash is not serialized.
- JWT secret should be provided through environment variables.

Important issue:

- `application.properties` currently contains concrete local credentials/secrets. In production and in public repos, these must be moved to environment variables and rotated.

### 9.6 CORS And CSRF

CORS:

- Configured with allowed origin patterns from `app.cors.origins`.
- Credentials enabled.

CSRF:

- Disabled in Spring Security because the API is stateless JWT-based.
- Since cookies are used, production should set SameSite and Secure flags and evaluate CSRF protections for state-changing requests.

### 9.7 Rate Limiting

Implemented:

- Login failed-attempt tracking: 5 failed attempts causes a 15-minute lockout per `IP:email`.

Not implemented:

- OTP rate limit.
- Message rate limit.
- General API rate limit.

### 9.8 Input Validation And Sanitization

Implemented:

- DTO validation annotations.
- Frontend required fields.
- React output escaping.
- JPA parameterized queries prevent SQL injection in repository methods.

Recommended:

- Stronger max-length constraints.
- Validate enum fields.
- Add profanity/spam controls.
- Validate avatar URL and future file uploads.

### 9.9 Error Messages

The app returns concise errors like "Invalid email or password" and "Not a member." This avoids revealing whether a wrong password or missing email caused login failure.

---

## Section 10: Performance And Optimization

### 10.1 Frontend

Current:

- Room-level message caching.
- Message load limit.
- Search over currently loaded messages.
- Reconnect backoff.

Future:

- Route-level lazy loading.
- Message virtualization.
- Memoized message grouping.
- Bundle analysis.
- Image/avatar optimization.

### 10.2 Backend

Current:

- Pagination-like `limit` for room history.
- Hikari connection pool max size configured.
- Transactional writes.

Future:

- Cursor pagination.
- Projections/fetch joins.
- Async notification processing.
- Response compression.

### 10.3 Database

Use explicit indexes and migrations for production. Avoid relying on `ddl-auto=update`. Monitor slow queries, add full-text search indexes, and archive old messages if message volume grows.

### 10.4 WebSocket

Current:

- In-memory connection maps.
- Multiple sessions per user.
- Broadcast to subscribed room users.

Future:

- Heartbeats.
- Redis pub/sub for multi-instance deployments.
- Payload compression.
- Connection limits and cleanup metrics.

### 10.5 Caching

Current:

- Frontend memory cache by room.

Future:

- Redis for hot room metadata and presence.
- HTTP caching for static assets.
- CDN for uploaded files.

### 10.6 Metrics Targets

Reasonable targets:

- REST p95 under 200 ms for common reads/writes.
- WebSocket event delivery under 500 ms in same region.
- Error rate below 1%.
- Availability 99.9% after production hardening.

---

## Section 11: Testing

### 11.1 Frontend Testing

Available script:

```bash
npm test
```

Recommended tests:

- Login/signup form validation.
- Protected route redirect.
- Chat message rendering.
- Message edit/delete/reaction UI.
- Typing indicator timeout.
- Sidebar room selection.
- Settings profile update.

Tools:

- CRA/CRACO test stack.
- React Testing Library.
- Jest.

### 11.2 Backend Testing

Recommended:

- Unit tests for `AuthService`, `MessageService`, `ChannelService`, `GroupService`.
- Repository integration tests with test PostgreSQL or Testcontainers.
- API tests for auth, channel/group membership, message permissions.
- WebSocket tests for connection auth and event broadcast.

### 11.3 Test Data

Use builders/factories for users, channels, groups, memberships, and messages. Clean test data per test transaction or reset containers between integration suites.

---

## Section 12: Deployment And DevOps

### 12.1 Docker

No Dockerfile was found in the current file listing. Recommended backend Dockerfile:

```dockerfile
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn -q -DskipTests package

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8001
ENTRYPOINT ["java", "-jar", "app.jar"]
```

### 12.2 Docker Compose

Recommended services:

- `postgres`
- `springboot`
- optional `frontend`
- optional `redis`

### 12.3 CI/CD

Recommended GitHub Actions checks:

- Frontend install/build/test.
- Backend Maven test/package.
- Secret scan.
- Dependency audit.
- Deploy frontend to Vercel.
- Build and deploy backend image to Stitch.

### 12.4 Stitch Backend Deployment

Expected steps:

1. Build backend JAR or Docker image.
2. Set environment variables for DB URL, username, password, JWT secret, CORS origins.
3. Configure health check.
4. Deploy to Stitch.
5. Verify logs and `/api/auth` behavior.

### 12.5 Vercel Frontend Deployment

Build command:

```bash
npm run build
```

Environment variable:

```text
REACT_APP_BACKEND_URL=https://your-backend-host
```

### 12.6 Database Migrations

Current: Hibernate `ddl-auto=update`.

Production: add Flyway migrations named like:

```text
V1__create_users.sql
V2__create_chat_tables.sql
V3__add_message_indexes.sql
```

### 12.7 Environment Configuration

Required backend variables:

- `SPRING_DATASOURCE_URL`
- `SPRING_DATASOURCE_USERNAME`
- `SPRING_DATASOURCE_PASSWORD`
- `APP_JWT_SECRET`
- `APP_CORS_ORIGINS`

Required frontend variable:

- `REACT_APP_BACKEND_URL`

Never commit production secrets.

---

## Section 13: Infrastructure

### 13.1 Hosting Platforms

Frontend on Vercel:

- Excellent for React static builds.
- Global CDN.
- Preview deployments.

Backend on Stitch:

- Hosts Spring Boot service.
- Provides logs and environment configuration.

PostgreSQL:

- Relational consistency is valuable for memberships, messages, reactions, and users.

### 13.2 Database

PostgreSQL is configured locally as `jdbc:postgresql://localhost:5432/parlancechat`. Production should use a managed database with backups, connection limits, SSL, and credentials stored outside source code.

### 13.3 CDN And Static Files

Frontend static files are served by Vercel CDN. Future uploaded files should be stored in object storage and served through CDN with cache headers.

### 13.4 Monitoring And Logging

Recommended:

- Stitch logs for backend.
- Vercel function/build logs for frontend.
- Spring Boot Actuator health endpoint.
- Error tracking such as Sentry.
- Metrics for API latency and active WebSocket sessions.

### 13.5 Scalability

Current app is stateless for REST but WebSocket presence/fanout is in-memory. To scale horizontally:

- Use sticky sessions or externalize WebSocket state.
- Use Redis pub/sub for cross-instance broadcasts.
- Store presence in Redis with TTL.
- Add load balancer.
- Optimize DB indexes and add read replicas if needed.

---

## Section 14: Development Workflow

### 14.1 Local Setup

Prerequisites:

- Node.js 16+
- Java 17
- Maven
- PostgreSQL
- Python 3.8+ if using proxy tests/backend

Frontend:

```bash
cd frontend
npm install
npm start
```

Backend:

```bash
cd springboot
mvn spring-boot:run
```

Frontend env:

```text
REACT_APP_BACKEND_URL=http://localhost:8001
```

### 14.2 Git Workflow

Recommended:

- Branches: `feature/...`, `bugfix/...`, `hotfix/...`.
- Commits: concise imperative messages.
- PR checks: test, lint, build.
- Merge through pull requests.

### 14.3 Code Quality

Current:

- ESLint dependencies exist.
- Tailwind and component separation improve consistency.
- Backend packages are organized by layer.

Recommended:

- TypeScript migration.
- Prettier.
- Backend formatting plugin.
- DTO validation audit.
- CI-enforced tests.

### 14.4 Documentation

Current:

- `README.md` gives setup and architecture overview.
- This file provides interview prep.

Recommended:

- Swagger/OpenAPI docs.
- WebSocket protocol docs.
- Deployment runbook.
- Database schema diagrams.

---

## Section 15: Common Scenarios And Flows

### 15.1 Registration

1. User enters email, username, display name, password.
2. Frontend validates required fields and password length.
3. Backend validates uniqueness.
4. User is saved with BCrypt password hash.
5. JWTs are created.
6. Cookies are set.
7. Frontend stores user and token and enters chat.

### 15.2 Login

1. User enters email/password.
2. Backend checks login attempt rate limit.
3. Backend finds user and verifies BCrypt hash.
4. Backend creates tokens.
5. Frontend stores access token for WebSocket and user state.
6. Chat provider connects WebSocket and loads rooms.

### 15.3 Sending A Message

1. User types message.
2. Presses Enter or send.
3. Frontend POSTs to `/api/messages` or `/api/dm`.
4. Backend validates membership/recipient.
5. Message is saved.
6. Backend enriches DTO.
7. Backend broadcasts WebSocket event.
8. Frontend appends message if ID not already present.

### 15.4 Receiving A Message

1. Other user sends message.
2. Backend saves and broadcasts.
3. Client receives `type=message`.
4. `ChatContext` updates `messages[room_id]`.
5. `ChatView` rerenders.
6. Scroll moves to bottom.

### 15.5 Typing Indicator

1. User begins typing.
2. Frontend sends `typing_start`.
3. Backend broadcasts to room except sender.
4. Recipients show typing indicator.
5. User stops typing or sends message.
6. Frontend sends `typing_stop`.
7. Recipients remove typing indicator.

### 15.6 Creating A Channel

1. User opens modal.
2. Enters name, description, channel type.
3. Frontend POSTs to `/api/channels`.
4. Backend normalizes name and checks uniqueness.
5. Channel is saved.
6. Creator is added as admin member.
7. Frontend reloads channels.

### 15.7 Creating A Group

1. User opens group modal.
2. Searches users with debounce.
3. Selects members.
4. POSTs to `/api/groups`.
5. Backend creates group and membership rows.
6. Frontend reloads groups.

### 15.8 Searching Messages

Current:

1. User clicks search icon.
2. User types query.
3. Frontend filters loaded room messages.

Future:

1. Debounce query.
2. Call backend search endpoint.
3. Return paginated results.

### 15.9 File Upload

Not implemented. See Section 8.11 for recommended flow.

### 15.10 WebSocket Connection

1. User authenticates.
2. Frontend gets/stores access token.
3. WebSocket opens `/api/ws?token=...`.
4. Backend validates token.
5. Backend stores session.
6. Backend subscribes user to channel/group rooms.
7. Backend marks user online.
8. Backend broadcasts presence.
9. Frontend receives connected event and online user list.

---

## Section 16: Key Terms And Definitions

JWT: signed token used to authenticate requests.

Refresh token: longer-lived token used to get a new access token.

BCrypt: password hashing algorithm with salt and configurable work factor.

WebSocket: persistent bidirectional connection between browser and server.

STOMP: messaging protocol over WebSocket; not used in this implementation.

Room: internal chat destination identified by channel ID, group ID, or deterministic DM ID.

DTO: Data Transfer Object used for API request/response shapes.

Entity: Java class mapped to a database table.

Repository: Spring Data interface for database access.

Service: business logic layer.

Controller: HTTP request handler.

Presence: online/offline/away state.

Soft delete: marking a message deleted without removing the database row.

N+1 query: inefficient pattern where loading a list triggers one extra query per row.

Pagination: loading data in chunks.

Horizontal scaling: running multiple backend instances behind a load balancer.

Redis pub/sub: common mechanism for broadcasting events across multiple backend instances.

---

## Section 17: Challenges And Solutions

### 17.1 Real-Time Synchronization

Problem: REST alone cannot push new messages instantly.

Solution: WebSocket broadcasts events after durable REST writes.

### 17.2 Offline And Reconnect

Problem: WebSocket connections can drop.

Solution: Frontend reconnects with exponential backoff. Future work: offline message queue.

### 17.3 Database Performance

Problem: message tables grow quickly.

Solution: limit history to 50 messages currently; add indexes and cursor pagination for production.

### 17.4 N+1 Queries

Problem: enriching each message fetches sender/reactions/reply preview.

Current: simple implementation favors clarity.

Future: use join fetches, projections, batched loading, or materialized read models.

### 17.5 Scalability

Problem: in-memory WebSocket maps do not work across multiple instances.

Solution: Redis-backed presence and pub/sub, sticky sessions, or a dedicated real-time gateway.

### 17.6 Security

Problem: prevent unauthorized access and unsafe data.

Solution: JWT auth, BCrypt, membership checks, ownership checks, CORS, basic rate limiting.

### 17.7 File Storage

Problem: storing large files in app server is not scalable.

Solution: use object storage like S3 and store metadata/URLs in DB.

### 17.8 Notification Delivery

Problem: offline users miss real-time events.

Solution: persistent notifications table and browser/email/push delivery.

### 17.9 WebSocket Memory

Problem: many open sessions consume memory.

Solution: session cleanup on disconnect, connection metrics, heartbeat timeouts, horizontal scaling strategy.

### 17.10 Message Ordering

Problem: real-time events can arrive out of order.

Current: messages have `created_at`; frontend appends received events.

Future: sort by server timestamp and use monotonic IDs/cursors.

---

## Section 18: Testing Scenarios

Authentication:

- Register valid user.
- Duplicate email.
- Duplicate username.
- Weak password frontend validation.
- Login valid credentials.
- Login invalid credentials.
- Five failed attempts triggers lockout.
- Refresh token returns new access token.
- Logout clears user state.

Messaging:

- Send channel message as member.
- Reject channel message as non-member.
- Send group message as member.
- Send DM.
- Edit own message.
- Reject edit of another user's message.
- Soft delete own message.
- Toggle reaction add/remove.
- Reply preview displays.

Channels:

- Create channel.
- Reject duplicate name.
- Join channel.
- Leave channel.
- Load channel members.
- Broadcast channel admin-only posting.

Groups:

- Create group with selected members.
- List my groups.
- Reject member list for non-member.

WebSocket:

- Reject connection with invalid token.
- Accept valid token.
- Broadcast presence on connect/disconnect.
- Broadcast typing events.
- Broadcast message, edit, delete, reaction events.

Security:

- Missing token gets 401.
- Invalid JWT gets 401.
- Non-member room access gets 403.
- SQL injection input is treated as data.
- XSS text renders as text, not HTML.

Performance:

- Load 50-message room history.
- Connect multiple sessions per user.
- Search users with 50-result cap.

---

## Section 19: Deployment Checklist

- Tests passing.
- Frontend production build passes.
- Backend Maven package passes.
- Database migrations prepared.
- Secrets moved to environment variables.
- JWT secret rotated if previously committed.
- CORS origins set to production frontend.
- HTTPS/WSS enabled.
- Secure/SameSite cookies configured.
- Health checks configured.
- Logs accessible.
- Backups configured for PostgreSQL.
- Rollback procedure documented.
- Monitoring/error tracking configured.

---

## Section 20: Frequently Asked Interview Questions

Q: What is Parlance?

A: Parlance is a full-stack real-time chat app with users, channels, groups, DMs, WebSocket messaging, presence, typing indicators, replies, reactions, and profile settings.

Q: Why React?

A: React fits component-heavy UIs like chat apps. It let me model the app as reusable components such as sidebar, chat view, message item, member panel, and modals.

Q: Why Spring Boot?

A: Spring Boot gave me production-oriented backend features quickly: REST controllers, security, validation, JPA, WebSocket support, dependency injection, and structured service layers.

Q: Does the app use STOMP?

A: No. The current implementation uses native WebSocket JSON events at `/api/ws`. STOMP would be a future option if I wanted broker-style destinations and topic semantics.

Q: How does real-time messaging work?

A: The frontend creates messages through REST. The backend saves the message to PostgreSQL, enriches it into a DTO, then broadcasts a WebSocket event to users subscribed to that room.

Q: How are DMs modeled?

A: DMs use the same `messages` table. The backend creates a deterministic room ID from the sorted two user IDs, so both users resolve to the same room.

Q: How is authentication implemented?

A: Users log in with email/password. Passwords are hashed with BCrypt. The backend issues JWT access and refresh tokens, stores them in HTTP-only cookies, and validates access tokens with a Spring Security filter.

Q: Why store a token in localStorage?

A: REST uses cookies, but the WebSocket connection currently passes a token in the query string, so the frontend keeps the returned access token in localStorage. It works, but I would improve this in production by using a safer WebSocket auth approach.

Q: How is presence tracked?

A: The backend stores active WebSocket sessions in memory. When a user connects, they are marked online and a presence event is broadcast. When their last session closes, they are marked offline.

Q: How do typing indicators work?

A: The input sends `typing_start` and `typing_stop` WebSocket events. The backend broadcasts to other room users. The receiver clears indicators either on stop event or after a timeout.

Q: How do reactions work?

A: Reactions are rows in the `reactions` table with a unique constraint on message/user/emoji. Toggling either inserts or deletes the row, then broadcasts a `reaction` event.

Q: How do you prevent unauthorized room access?

A: Services check channel/group membership before sending or reading messages. Editing and deleting also check that the authenticated user is the sender.

Q: How do you prevent SQL injection?

A: Spring Data JPA uses parameterized queries and derived query methods, so user input is not string-concatenated into SQL.

Q: How do you prevent XSS?

A: React escapes message content by default, and the message renderer does not use raw HTML. I would add CSP and stricter sanitization for rich text or uploaded content.

Q: What are the biggest limitations?

A: No OTP/password reset yet, no read receipts, no file uploads, no persistent notifications, no Redis-backed multi-instance WebSocket scaling, and migrations are not yet Flyway-managed.

Q: How would you scale it?

A: Keep REST stateless, add Redis for presence and WebSocket pub/sub, add explicit DB indexes and cursor pagination, use object storage/CDN for files, add load balancing, and monitor latency/error rates.

Q: How would you improve database performance?

A: Add indexes on room/timestamp and membership columns, use cursor pagination, reduce N+1 queries through batch loading or projections, and add full-text search indexes for message search.

Q: Why PostgreSQL?

A: Chat data has strong relational structure: users, memberships, messages, reactions, and permissions. PostgreSQL gives consistency, indexes, constraints, and strong query capabilities.

Q: What testing would you prioritize?

A: Auth and authorization tests first, then message send/edit/delete/reaction flows, membership checks, WebSocket broadcast tests, and frontend route/form/component tests.

Q: What would you do differently?

A: I would start with TypeScript on the frontend, add migrations from day one, avoid localStorage for WebSocket auth, and design Redis-backed presence earlier if horizontal scaling were a near-term requirement.

---

## Section 21: Improvements And Future Features

Current limitations:

- No OTP/password reset.
- No file uploads.
- No read receipts.
- No persistent notification system.
- No end-to-end encryption.
- No audio/video calling.
- No Redis for multi-instance WebSocket broadcasts.
- No explicit migration files.
- Basic search only.

Potential improvements:

- OTP/email verification.
- OAuth with Google/GitHub.
- Two-factor authentication.
- File sharing with object storage.
- Browser notifications.
- Read receipts.
- Message forwarding.
- Scheduled messages.
- Moderation tools.
- Custom emoji.
- Bot integrations.
- Full-text search.
- Redis caching and pub/sub.
- Message virtualization.
- Observability dashboards.

---

## Section 22: Lessons Learned

Technical learnings:

- Real-time apps need a clear split between durable writes and ephemeral events.
- WebSocket presence is simple in one instance but needs external coordination when scaled.
- Shared message tables simplify feature logic across chat types.
- DTO enrichment is convenient but can cause N+1 query patterns if not optimized.
- Authentication for WebSockets needs special design because cookies/headers are less straightforward than REST.

Project management learnings:

- Build core flows first: auth, room creation, message persistence, live delivery.
- Leave complex features like file uploads and notifications until the core chat loop is stable.
- Keep UI components small enough that state flow remains explainable.

What I would do differently:

- Add TypeScript from the start.
- Add Flyway migrations from the start.
- Use explicit DTO validation and enums earlier.
- Add tests while building each backend service.
- Plan horizontal WebSocket scaling before deployment if multi-instance production is required.

---

## Section 23: Summary And Key Takeaways

Parlance demonstrates full-stack development across frontend, backend, database, authentication, and real-time systems.

Key achievements:

- Working authenticated chat product.
- Real-time WebSocket messaging.
- Channels, groups, and DMs.
- Presence and typing indicators.
- Message replies, editing, deletion, and reactions.
- PostgreSQL persistence through Spring Data JPA.
- Polished React/Tailwind UI.

Technical highlights:

- JWT auth with access/refresh tokens.
- Spring Security filter-based authentication.
- Native WebSocket event protocol.
- Shared message model across chat types.
- Membership-based authorization.
- Responsive chat layout and stateful frontend.

Skills demonstrated:

- Full-stack application design.
- REST API design.
- WebSocket communication.
- Relational database modeling.
- Security and authentication.
- Frontend state management.
- UI/UX implementation.
- Performance and scalability reasoning.
- Production-readiness thinking.
