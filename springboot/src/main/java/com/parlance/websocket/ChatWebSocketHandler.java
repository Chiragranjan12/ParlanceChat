package com.parlance.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parlance.repository.ChannelMemberRepository;
import com.parlance.repository.GroupMemberRepository;
import com.parlance.repository.UserRepository;
import com.parlance.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Component
@Slf4j
@RequiredArgsConstructor
public class ChatWebSocketHandler extends TextWebSocketHandler {

    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;
    private final ChannelMemberRepository channelMemberRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final ObjectMapper objectMapper;

    // userId -> list of sessions (multiple tabs)
    private final ConcurrentHashMap<String, CopyOnWriteArrayList<WebSocketSession>> connections = new ConcurrentHashMap<>();
    // roomId -> set of userIds
    private final ConcurrentHashMap<String, Set<String>> roomUsers = new ConcurrentHashMap<>();
    // sessionId -> userId
    private final ConcurrentHashMap<String, String> sessionUserMap = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        String token = getTokenFromQuery(session);
        if (token == null || !jwtUtil.validateToken(token)) {
            closeSession(session, CloseStatus.NOT_ACCEPTABLE);
            return;
        }
        try {
            String userId = jwtUtil.getUserId(token);
            sessionUserMap.put(session.getId(), userId);
            connections.computeIfAbsent(userId, k -> new CopyOnWriteArrayList<>()).add(session);

            // Subscribe to user's channels and groups
            channelMemberRepository.findByUserId(userId)
                    .forEach(m -> subscribeUserToRoom(userId, m.getChannelId()));
            groupMemberRepository.findByUserId(userId)
                    .forEach(m -> subscribeUserToRoom(userId, m.getGroupId()));

            // Update status
            userRepository.findById(userId).ifPresent(u -> {
                u.setStatus("online");
                u.setLastSeen(Instant.now());
                userRepository.save(u);
            });

            // Broadcast presence
            broadcastAll(Map.of("type", "presence", "user_id", userId, "status", "online"));

            // Send connected event
            Map<String, Object> connected = new HashMap<>();
            connected.put("type", "connected");
            connected.put("user_id", userId);
            connected.put("online_users", new ArrayList<>(connections.keySet()));
            sendToSession(session, connected);

        } catch (Exception e) {
            log.error("WS connect error: {}", e.getMessage());
            closeSession(session, CloseStatus.SERVER_ERROR);
        }
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        String userId = sessionUserMap.get(session.getId());
        if (userId == null) return;

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> data = objectMapper.readValue(message.getPayload(), Map.class);
            String type = (String) data.get("type");

            switch (type != null ? type : "") {
                case "typing_start" -> {
                    String roomId = (String) data.get("room_id");
                    if (roomId != null) {
                        userRepository.findById(userId).ifPresent(u -> {
                            String name = u.getDisplayName() != null ? u.getDisplayName() : u.getUsername();
                            broadcastToRoom(roomId, Map.of(
                                "type", "typing", "room_id", roomId,
                                "user_id", userId, "username", name, "is_typing", true
                            ), userId);
                        });
                    }
                }
                case "typing_stop" -> {
                    String roomId = (String) data.get("room_id");
                    if (roomId != null) {
                        broadcastToRoom(roomId, Map.of(
                            "type", "typing", "room_id", roomId,
                            "user_id", userId, "is_typing", false
                        ), userId);
                    }
                }
                case "subscribe_room" -> {
                    String roomId = (String) data.get("room_id");
                    if (roomId != null) subscribeUserToRoom(userId, roomId);
                }
                case "presence_update" -> {
                    String status = (String) data.getOrDefault("status", "online");
                    userRepository.findById(userId).ifPresent(u -> {
                        u.setStatus(status);
                        userRepository.save(u);
                    });
                    broadcastAll(Map.of("type", "presence", "user_id", userId, "status", status));
                }
            }
        } catch (Exception e) {
            log.warn("WS message error: {}", e.getMessage());
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        String userId = sessionUserMap.remove(session.getId());
        if (userId == null) return;

        CopyOnWriteArrayList<WebSocketSession> sessions = connections.get(userId);
        if (sessions != null) {
            sessions.remove(session);
            if (sessions.isEmpty()) {
                connections.remove(userId);
                roomUsers.values().forEach(users -> users.remove(userId));
                // Update offline status
                userRepository.findById(userId).ifPresent(u -> {
                    u.setStatus("offline");
                    u.setLastSeen(Instant.now());
                    userRepository.save(u);
                });
                broadcastAll(Map.of("type", "presence", "user_id", userId, "status", "offline"));
            }
        }
    }

    public void subscribeUserToRoom(String userId, String roomId) {
        roomUsers.computeIfAbsent(roomId, k -> ConcurrentHashMap.newKeySet()).add(userId);
    }

    public void broadcastToRoom(String roomId, Map<String, Object> payload) {
        broadcastToRoom(roomId, payload, null);
    }

    public void broadcastToRoom(String roomId, Map<String, Object> payload, String excludeUserId) {
        Set<String> users = roomUsers.getOrDefault(roomId, Collections.emptySet());
        for (String uid : users) {
            if (uid.equals(excludeUserId)) continue;
            sendToUser(uid, payload);
        }
    }

    public void broadcastAll(Map<String, Object> payload) {
        for (String uid : connections.keySet()) {
            sendToUser(uid, payload);
        }
    }

    public void sendToUser(String userId, Map<String, Object> payload) {
        CopyOnWriteArrayList<WebSocketSession> sessions = connections.get(userId);
        if (sessions == null) return;
        for (WebSocketSession session : sessions) {
            sendToSession(session, payload);
        }
    }

    public boolean isOnline(String userId) {
        CopyOnWriteArrayList<WebSocketSession> sessions = connections.get(userId);
        return sessions != null && !sessions.isEmpty();
    }

    public List<String> getOnlineUsers() {
        return new ArrayList<>(connections.keySet());
    }

    private void sendToSession(WebSocketSession session, Map<String, Object> payload) {
        try {
            if (session.isOpen()) {
                session.sendMessage(new TextMessage(objectMapper.writeValueAsString(payload)));
            }
        } catch (IOException e) {
            log.warn("WS send error to session {}: {}", session.getId(), e.getMessage());
        }
    }

    private String getTokenFromQuery(WebSocketSession session) {
        String query = session.getUri() != null ? session.getUri().getQuery() : null;
        if (query == null) return null;
        return Arrays.stream(query.split("&"))
                .filter(p -> p.startsWith("token="))
                .map(p -> p.substring(6))
                .findFirst().orElse(null);
    }

    private void closeSession(WebSocketSession session, CloseStatus status) {
        try { session.close(status); } catch (IOException ignored) {}
    }
}
