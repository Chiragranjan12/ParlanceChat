# ParlanceChat - Real-Time Chat Application

[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.2.3-brightgreen)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-18-blue)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Latest-336791)](https://www.postgresql.org)

ParlanceChat is a full-stack real-time chat application with channel messaging, group conversations, direct messages, WebSocket delivery, presence tracking, typing indicators, profile management, and a dark-mode-first React interface.

## Features

### Implemented

- **Authentication and security**
  - User registration and login
  - JWT access and refresh tokens
  - Secure password hashing with BCrypt
  - HTTP-only token cookies
  - Login attempt throttling
  - DTO validation with Jakarta Validation
  - Centralized custom exception handling

- **Chat types**
  - Public, private, and broadcast channels
  - Invite-style groups
  - One-to-one direct messages
  - Shared message model across channels, groups, and DMs

- **Real-time messaging**
  - Native WebSocket delivery
  - Message send, edit, and soft delete
  - Reply previews
  - Emoji reactions
  - Sender and reaction enrichment

- **Presence and activity**
  - Online and offline status tracking
  - Last seen timestamps
  - Typing start and stop events
  - Presence broadcast over WebSocket

- **User management**
  - Search users by username or display name
  - Profile updates for display name, bio, and avatar URL
  - Channel and group member lists

- **Frontend experience**
  - React 18 application
  - Tailwind CSS styling
  - Responsive dark UI
  - Framer Motion animations
  - Toast notifications
  - Lucide icons and Radix/shadcn-style primitives

### Future Enhancements

- Email verification and OTP support
- Password reset flow
- Read receipts
- File uploads and attachments
- Browser push notifications
- Cursor-based message pagination
- Full-text message search
- Redis-backed presence for multi-instance deployments
- Database migrations with Flyway or Liquibase
- End-to-end encryption

## Architecture

```text
React frontend
  - Pages, components, contexts, hooks
  - Axios for REST calls
  - Native WebSocket client

        REST / WebSocket
              |
              v

Optional Python FastAPI proxy
  - Proxies HTTP traffic to Spring Boot
  - Proxies /api/ws WebSocket traffic
  - Can start the packaged Spring Boot JAR in deployment

        REST / WebSocket
              |
              v

Spring Boot backend
  - Controllers expose REST APIs
  - Services hold business logic
  - Repositories use Spring Data JPA
  - Security handles JWT auth
  - WebSocket handler broadcasts real-time events
  - Global exception handler returns consistent errors

              |
              v

PostgreSQL database
  - users, messages, channels, groups
  - channel_members, group_members
  - reactions, login_attempts
```

### Message Flow

1. A user sends a message from the React chat view.
2. The frontend posts to `/api/messages` with `content`, `roomType`, and `roomId`.
3. Spring Boot validates the request body and user membership.
4. The message is saved in PostgreSQL.
5. The service enriches the message with sender, reply, and reaction details.
6. The WebSocket handler broadcasts the message to subscribed room members.
7. Connected clients update their local message state in real time.

## Tech Stack

### Frontend

- React 18
- React Router
- Tailwind CSS
- Axios
- Native WebSocket
- Framer Motion
- React Hot Toast / Sonner
- Lucide React
- Radix UI primitives
- Zod and React Hook Form

### Backend

- Java 17
- Spring Boot 3.2.3
- Spring Web
- Spring Security
- Spring Data JPA
- Spring WebSocket
- Jakarta Validation
- JJWT
- BCrypt
- Lombok

### Database

- PostgreSQL
- Hibernate ORM

### Optional Proxy

- Python
- FastAPI
- httpx
- websockets

## Getting Started

### Prerequisites

- Node.js 16 or higher
- Yarn or npm
- Java 17 or higher
- Maven 3.8 or higher
- PostgreSQL 12 or higher
- Python 3.8 or higher, only if using the FastAPI proxy

### Environment Variables

Create a root `.env` file for local development. This file is ignored by Git.

```bash
DB_URL=postgre_sql
DB_USERNAME=postgres
DB_PASSWORD=postgres

JWT_SECRET=replace-with-a-random-secret
JWT_ACCESS_EXPIRY=86400000
JWT_REFRESH_EXPIRY=604800000

ADMIN_EMAIL=admin@parlance.com
ADMIN_PASSWORD=change-this-local-admin-password
ADMIN_USERNAME=admin

CORS_ORIGINS=http://localhost:3000,http://localhost:8001,http://127.0.0.1:3000
PORT=8080
```

Create the database:

```bash
createdb parlancechat
```

Or with `psql`:

```sql
CREATE DATABASE parlancechat;
```

### Run Spring Boot Directly

```bash
cd springboot
mvn clean install
mvn spring-boot:run
```

The Spring Boot server uses `PORT`, defaulting to `8080` when not set.

### Run the Frontend

```bash
cd frontend
yarn install
```

Create `frontend/.env.local`:

```bash
REACT_APP_BACKEND_URL=http://localhost:8080
```

Start the app:

```bash
yarn start
```

The frontend runs on `http://localhost:3000`.

### Run Through the Python Proxy

The optional FastAPI proxy listens on `http://localhost:8001` and forwards traffic to the packaged Spring Boot JAR.

```bash
cd springboot
mvn clean package
```

```bash
cd backend
pip install -r requirements.txt
python server.py
```

When using the proxy, set the frontend backend URL to:

```bash
REACT_APP_BACKEND_URL=http://localhost:8001
```

## API Documentation

### Authentication

| Method | Endpoint | Description | Auth |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | Register a new user | No |
| POST | `/api/auth/login` | Login with credentials | No |
| POST | `/api/auth/logout` | Logout current user | Yes |
| GET | `/api/auth/me` | Get current authenticated user | Yes |
| POST | `/api/auth/refresh` | Refresh access token | Cookie |

### Channels

| Method | Endpoint | Description | Auth |
| --- | --- | --- | --- |
| GET | `/api/channels` | List all channels | Yes |
| GET | `/api/channels/mine` | List joined channels | Yes |
| POST | `/api/channels` | Create a channel | Yes |
| POST | `/api/channels/{channelId}/join` | Join a channel | Yes |
| DELETE | `/api/channels/{channelId}/leave` | Leave a channel | Yes |
| GET | `/api/channels/{channelId}/members` | Get channel members | Yes |
| GET | `/api/channels/{channelId}/messages?limit=50` | Get channel messages | Yes |

### Groups

| Method | Endpoint | Description | Auth |
| --- | --- | --- | --- |
| GET | `/api/groups` | List current user's groups | Yes |
| POST | `/api/groups` | Create a group | Yes |
| GET | `/api/groups/{groupId}/members` | Get group members | Yes |
| GET | `/api/groups/{groupId}/messages?limit=50` | Get group messages | Yes |

### Messages

| Method | Endpoint | Description | Auth |
| --- | --- | --- | --- |
| POST | `/api/messages` | Send a channel or group message | Yes |
| PUT | `/api/messages/{messageId}` | Edit a message | Yes |
| DELETE | `/api/messages/{messageId}` | Delete a message | Yes |
| POST | `/api/messages/{messageId}/reactions` | Toggle a reaction | Yes |

### Direct Messages

| Method | Endpoint | Description | Auth |
| --- | --- | --- | --- |
| GET | `/api/dm/list` | List DM conversations | Yes |
| GET | `/api/dm/{otherUserId}/messages?limit=50` | Get DM messages | Yes |
| POST | `/api/dm` | Send a direct message | Yes |

### Users and Presence

| Method | Endpoint | Description | Auth |
| --- | --- | --- | --- |
| GET | `/api/users` | Search users with optional `q` | Yes |
| GET | `/api/users/me` | Get current user | Yes |
| PUT | `/api/users/me` | Update profile | Yes |
| GET | `/api/users/{userId}` | Get a user by ID | Yes |
| GET | `/api/presence` | List online users | Yes |
| PUT | `/api/presence/status` | Broadcast presence status | Yes |

### WebSocket

Connect with:

```text
ws://localhost:8080/api/ws?token=<access_token>
```

When using the proxy:

```text
ws://localhost:8001/api/ws?token=<access_token>
```

Client messages:

```json
{"type":"subscribe_room","room_id":"channel-id"}
{"type":"typing_start","room_id":"channel-id"}
{"type":"typing_stop","room_id":"channel-id"}
{"type":"presence_update","status":"away"}
```

Server events include:

```json
{"type":"connected","user_id":"user-id","online_users":["user-id"]}
{"type":"message","data":{}}
{"type":"typing","room_id":"room-id","user_id":"user-id","is_typing":true}
{"type":"presence","user_id":"user-id","status":"online"}
{"type":"reaction","message_id":"message-id","emoji":"thumbs-up","action":"add"}
```

## Error Responses

The backend returns consistent error bodies through `GlobalExceptionHandler`.

```json
{
  "code": "validation_error",
  "message": "Validation failed",
  "details": {
    "email": "Email must be a valid email address"
  },
  "timestamp": 1705315245123
}
```

Common error codes:

- `validation_error`
- `user_not_found`
- `invalid_password`
- `invalid_token`
- `unauthorized`
- `forbidden`
- `not_found`
- `conflict`
- `too_many_requests`
- `internal_error`

## Security Features

- JWT access and refresh tokens
- HTTP-only cookies for token storage
- BCrypt password hashing
- Configurable CORS origins
- Request body validation with `@Valid`
- Custom exception handling with safe client responses
- Membership checks for channels and groups
- Ownership checks for message edit and delete
- Login attempt throttling
- Spring Data JPA query parameterization
- Secrets loaded from environment variables

## Database Schema

### Core Tables

`users`

```sql
id, email, username, password_hash, display_name, avatar_url,
bio, status, role, created_at, last_seen
```

`messages`

```sql
id, content, sender_id, room_type, room_id, reply_to,
is_deleted, edited_at, created_at
```

`channels`

```sql
id, name, description, channel_type, created_by, created_at
```

`groups_table`

```sql
id, name, description, created_by, created_at
```

`channel_members`

```sql
id, channel_id, user_id, role, joined_at
```

`group_members`

```sql
id, group_id, user_id, role, joined_at
```

`reactions`

```sql
id, message_id, user_id, emoji, created_at
```

`login_attempts`

```sql
identifier, count, last_attempt
```

## Manual Testing

Register a user:

```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "username": "alice",
    "password": "Password123!",
    "displayName": "Alice Johnson"
  }'
```

Login:

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"Password123!"}'
```

Create a channel:

```bash
curl -X POST http://localhost:8080/api/channels \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "general",
    "description": "General discussion",
    "channelType": "public"
  }'
```

Send a message:

```bash
curl -X POST http://localhost:8080/api/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "content": "Hello everyone!",
    "roomType": "channel",
    "roomId": "CHANNEL_ID"
  }'
```

## Testing

Frontend:

```bash
cd frontend
yarn test
```

Spring Boot:

```bash
cd springboot
mvn test
```

Python proxy, if tests are present:

```bash
pytest
```

## Deployment

### Frontend

```bash
cd frontend
yarn build
```

Set:

```bash
REACT_APP_BACKEND_URL=https://your-backend.example.com
```

### Backend

```bash
cd springboot
mvn clean package
java -jar target/parlance-0.0.1-SNAPSHOT.jar
```

Production environment variables:

```bash
DB_URL=jdbc:postgresql://prod-db-host:5432/parlance
DB_USERNAME=prod_user
DB_PASSWORD=secure_password
JWT_SECRET=production-secret-key
JWT_ACCESS_EXPIRY=86400000
JWT_REFRESH_EXPIRY=604800000
CORS_ORIGINS=https://your-frontend.example.com
PORT=8080
```

### Docker

The Spring Boot backend includes a Dockerfile:

```bash
docker build -t parlance-backend ./springboot
```

## Troubleshooting

### Backend will not start

Check PostgreSQL:

```bash
psql -U postgres -d parlancechat -c "SELECT 1;"
```

Check required environment variables:

```bash
echo "$DB_URL"
echo "$DB_USERNAME"
echo "$DB_PASSWORD"
echo "$JWT_SECRET"
```

Check the port:

```bash
echo "$PORT"
```

### Frontend cannot connect to backend

Verify `frontend/.env.local`:

```bash
REACT_APP_BACKEND_URL=http://localhost:8080
```

Check backend availability:

```bash
curl http://localhost:8080/api/auth/me
```

### WebSocket connection fails

Check that the token is valid and the WebSocket URL matches the backend you are using:

```text
ws://localhost:8080/api/ws?token=<access_token>
```

or:

```text
ws://localhost:8001/api/ws?token=<access_token>
```

### Database connection fails

Test the database directly:

```bash
psql -h localhost -U postgres -d parlancechat -c "SELECT version();"
```

## Project Structure

```text
ParlanceChat/
|-- frontend/                      React application
|   |-- src/
|   |   |-- components/            Reusable UI components
|   |   |-- contexts/              Auth and chat state
|   |   |-- hooks/                 Custom hooks
|   |   |-- lib/                   Shared utilities
|   |   |-- pages/                 Route pages
|   |   `-- utils/                 Helper functions
|   |-- package.json
|   `-- tailwind.config.js
|
|-- backend/                       Optional Python FastAPI proxy
|   |-- requirements.txt
|   `-- server.py
|
|-- springboot/                    Spring Boot backend
|   |-- Dockerfile
|   |-- pom.xml
|   `-- src/main/
|       |-- java/com/parlance/
|       |   |-- config/
|       |   |-- controller/
|       |   |-- dto/
|       |   |-- exception/
|       |   |-- model/
|       |   |-- repository/
|       |   |-- security/
|       |   |-- service/
|       |   `-- websocket/
|       `-- resources/
|           `-- application.properties
|
|-- docs/
|-- .env                          Local environment variables, ignored
|-- .gitignore
|-- README.md
`-- package-lock.json
```

## Contributing

1. Fork the repository.
2. Create a feature branch.
3. Make focused changes.
4. Run relevant tests.
5. Open a pull request with a clear description.

## Support

For issues, questions, or suggestions, open a GitHub issue in this repository.


