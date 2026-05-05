# Parlance - Real-Time Chat Application PRD

## Overview
**Project Name:** Parlance  
**Description:** A modern, scalable real-time chat platform  
**Tech Stack:** React (frontend) + FastAPI + MongoDB (backend)  
**Last Updated:** 2026-05-05

---

## Architecture

### Backend (`/app/backend/server.py`)
- FastAPI with async Motor (MongoDB) driver
- JWT authentication (httpOnly cookies + localStorage for WebSocket)
- WebSocket connection manager for real-time events
- bcrypt password hashing, brute-force protection (5 attempts/15 min lockout)

### Frontend (`/app/frontend/src/`)
- React 18 with React Router v6
- Framer Motion animations
- React Hot Toast notifications
- WebSocket context for real-time messaging
- Tailwind CSS (dark/light theme support)

### Database Collections
- `users` - User accounts with status, avatar, bio
- `channels` - Public/private channels
- `channel_members` - Channel membership
- `groups` - Private groups
- `group_members` - Group membership  
- `messages` - All messages (channel, group, DM)
- `reactions` - Message emoji reactions
- `login_attempts` - Brute force protection

---

## What's Been Implemented (2026-05-05)

### Authentication
- [x] User registration (instant activation, no OTP)
- [x] User login with JWT (httpOnly cookies)
- [x] Token refresh mechanism
- [x] Logout with cookie cleanup + status update
- [x] Brute force protection (5 attempts/15 min lockout)
- [x] Admin account seeding (`admin@parlance.com` / `Admin1234!`)

### Channels
- [x] List all channels user has joined
- [x] Create new channels (public/private/broadcast)
- [x] Join/leave channels
- [x] Auto-join #general and #random on registration
- [x] Default seeded channels: general, random, announcements

### Groups
- [x] Create private groups with member invites
- [x] List user's groups
- [x] Group member management

### Messaging
- [x] Send/receive messages (channels, groups, DMs)
- [x] Real-time delivery via WebSocket
- [x] Message edit (own messages only)
- [x] Message soft-delete (own messages only)
- [x] Reply to messages (with preview)
- [x] Message grouping (consecutive same-user = compact view)
- [x] Message deduplication (prevents duplicate display)

### Direct Messages
- [x] DM list (recent conversations)
- [x] DM conversation view
- [x] Send DMs via REST or WebSocket broadcast

### Real-time Features
- [x] WebSocket connection management
- [x] Typing indicators (3-dot animation, auto-clear after 3.5s)
- [x] User presence (online/offline status)
- [x] Message reactions (emoji, toggle, count display)
- [x] Auto-reconnect with exponential backoff
- [x] Connection status banner (shows "Reconnecting...")

### UI/UX
- [x] Dark mode default (with light mode toggle in Settings)
- [x] Responsive layout (mobile sidebar overlay, tablet/desktop 3-col)
- [x] Login/Signup pages with decorative background
- [x] Sidebar with Channels, Groups, DM sections
- [x] Chat view with header, message list, input
- [x] Right panel with Members list (online/offline split)
- [x] Settings page (profile, appearance, notifications, privacy)
- [x] Emoji picker for reactions and message composition
- [x] Loading skeletons for messages
- [x] Empty states for channels and DMs
- [x] Toast notifications (react-hot-toast)

---

## Test Credentials
- **Admin:** admin@parlance.com / Admin1234!
- **Test User:** testuser@parlance.com / Test1234!
- **Test User 2:** newtest2@parlance.com / Test1234!

---

## Prioritized Backlog

### P0 - Critical (Missing)
- File/image upload support
- Unread message badges/counts

### P1 - High Priority
- Message search within chat
- Global search (users, channels, messages)
- Notifications page
- Channel browser (discover/join public channels)
- Mobile-optimized experience improvements

### P2 - Nice to Have
- User profile page (public view)
- Block/unblock users
- Message threading (thread panel)
- @mentions with autocomplete
- URL preview cards
- Code syntax highlighting in messages
- Push notifications (browser API)
- Read receipts

---

## API Endpoints Reference
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
POST /api/auth/refresh

GET  /api/users?q=
GET  /api/users/{id}
PUT  /api/users/me

GET  /api/channels
GET  /api/channels/mine
POST /api/channels
POST /api/channels/{id}/join
DELETE /api/channels/{id}/leave
GET  /api/channels/{id}/members
GET  /api/channels/{id}/messages

GET  /api/groups
POST /api/groups
GET  /api/groups/{id}/members
GET  /api/groups/{id}/messages

POST /api/messages
PUT  /api/messages/{id}
DELETE /api/messages/{id}
POST /api/messages/{id}/reactions

GET  /api/dm/list
GET  /api/dm/{user_id}/messages
POST /api/dm

GET  /api/presence
PUT  /api/presence/status
GET  /api/search?q=

WS   /api/ws?token={access_token}
```
