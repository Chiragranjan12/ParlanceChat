package com.parlance.service;

import com.parlance.dto.*;
import com.parlance.exception.MessageNotFoundException;
import com.parlance.exception.UnauthorizedException;
import com.parlance.exception.UserNotFoundException;
import com.parlance.exception.UserNotMemberException;
import com.parlance.model.*;
import com.parlance.repository.*;
import com.parlance.websocket.ChatWebSocketHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MessageService {

    private final MessageRepository messageRepository;
    private final ReactionRepository reactionRepository;
    private final UserRepository userRepository;
    private final ChannelRepository channelRepository;
    private final ChannelMemberRepository channelMemberRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final ChatWebSocketHandler wsHandler;

    public MessageDto enrich(Message msg) {
        MessageDto dto = new MessageDto();
        dto.setId(msg.getId());
        dto.setContent(msg.getContent());
        dto.setSenderId(msg.getSenderId());
        dto.setRoomType(msg.getRoomType());
        dto.setRoomId(msg.getRoomId());
        dto.setReplyTo(msg.getReplyTo());
        dto.setIsDeleted(msg.getIsDeleted());
        dto.setEditedAt(msg.getEditedAt());
        dto.setCreatedAt(msg.getCreatedAt());

        // Sender
        userRepository.findById(msg.getSenderId()).ifPresent(u -> dto.setSender(UserDto.from(u)));

        // Reactions
        List<Reaction> reactions = reactionRepository.findByMessageId(msg.getId());
        Map<String, MessageDto.ReactionInfo> reactionMap = new LinkedHashMap<>();
        for (Reaction r : reactions) {
            reactionMap.computeIfAbsent(r.getEmoji(), k -> {
                MessageDto.ReactionInfo ri = new MessageDto.ReactionInfo();
                ri.setCount(0);
                ri.setUsers(new ArrayList<>());
                return ri;
            });
            MessageDto.ReactionInfo ri = reactionMap.get(r.getEmoji());
            ri.setCount(ri.getCount() + 1);
            ri.getUsers().add(r.getUserId());
        }
        dto.setReactions(reactionMap);

        // Reply preview
        if (msg.getReplyTo() != null) {
            messageRepository.findById(msg.getReplyTo()).ifPresent(replyMsg -> {
                MessageDto.ReplyPreview rp = new MessageDto.ReplyPreview();
                rp.setContent(replyMsg.getContent());
                userRepository.findById(replyMsg.getSenderId()).ifPresent(u ->
                    rp.setSenderName(u.getDisplayName() != null ? u.getDisplayName() : u.getUsername()));
                dto.setReplyPreview(rp);
            });
        }
        return dto;
    }

    public List<MessageDto> getRoomMessages(String roomId, int limit) {
        int cappedLimit = Math.max(1, Math.min(limit, 100));
        List<Message> msgs = messageRepository.findByRoomIdDesc(roomId, PageRequest.of(0, cappedLimit));
        Collections.reverse(msgs);
        return msgs.stream().map(this::enrich).collect(Collectors.toList());
    }

    @Transactional
    public MessageDto sendMessage(MessageRequestDto.SendMessage req, String senderId) {
        // Validate membership
        if ("channel".equals(req.getRoomType())) {
            if (!channelMemberRepository.existsByChannelIdAndUserId(req.getRoomId(), senderId))
                throw new UserNotMemberException(senderId, req.getRoomId(), "channel");
            // Broadcast channels: admins-only post
            channelRepository.findById(req.getRoomId()).ifPresent(ch -> {
                if ("broadcast".equalsIgnoreCase(ch.getChannelType())) {
                    User sender = userRepository.findById(senderId).orElse(null);
                    var cm = channelMemberRepository.findByChannelIdAndUserId(req.getRoomId(), senderId).orElse(null);
                    boolean isAdmin = (sender != null && "admin".equalsIgnoreCase(sender.getRole()))
                            || (cm != null && "admin".equalsIgnoreCase(cm.getRole()));
                    if (!isAdmin) {
                        throw new UnauthorizedException("Only admins can post in announcement channels");
                    }
                }
            });
        } else if ("group".equals(req.getRoomType())) {
            if (!groupMemberRepository.existsByGroupIdAndUserId(req.getRoomId(), senderId))
                throw new UserNotMemberException(senderId, req.getRoomId(), "group");
        }
        Message msg = messageRepository.save(Message.builder()
                .content(req.getContent()).senderId(senderId)
                .roomType(req.getRoomType()).roomId(req.getRoomId())
                .replyTo(req.getReplyTo()).build());
        MessageDto dto = enrich(msg);
        wsHandler.broadcastToRoom(req.getRoomId(), Map.of("type", "message", "data", dto));
        return dto;
    }

    @Transactional
    public MessageDto sendDm(MessageRequestDto.SendDm req, String senderId) {
        if (senderId.equals(req.getRecipientId())) {
            throw new UnauthorizedException("Can't DM yourself");
        }
        userRepository.findById(senderId).orElseThrow(() -> new UserNotFoundException(senderId));
        userRepository.findById(req.getRecipientId()).orElseThrow(() -> new UserNotFoundException(req.getRecipientId()));

        String roomId = generateDMRoomId(senderId, req.getRecipientId());
        Message msg = messageRepository.save(Message.builder()
                .content(req.getContent()).senderId(senderId)
                .roomType("dm").roomId(roomId)
                .replyTo(req.getReplyTo()).build());
        MessageDto dto = enrich(msg);
        Map<String, Object> payload = Map.of("type", "message", "data", dto);
        wsHandler.sendToUser(senderId, payload);
        wsHandler.sendToUser(req.getRecipientId(), payload);
        return dto;
    }

    @Transactional
    public MessageDto editMessage(String messageId, String content, String userId) {
        Message msg = messageRepository.findById(messageId)
                .orElseThrow(() -> new MessageNotFoundException(messageId));
        if (!msg.getSenderId().equals(userId))
            throw new UnauthorizedException("Cannot edit others' messages");
        msg.setContent(content);
        msg.setEditedAt(Instant.now());
        messageRepository.save(msg);
        MessageDto dto = enrich(msg);
        wsHandler.broadcastToRoom(msg.getRoomId(), Map.of("type", "message_edited", "data", dto));
        return dto;
    }

    @Transactional
    public void deleteMessage(String messageId, String userId) {
        Message msg = messageRepository.findById(messageId)
                .orElseThrow(() -> new MessageNotFoundException(messageId));
        if (!msg.getSenderId().equals(userId))
            throw new UnauthorizedException("Cannot delete others' messages");
        msg.setIsDeleted(true);
        msg.setContent("This message was deleted");
        messageRepository.save(msg);
        wsHandler.broadcastToRoom(msg.getRoomId(), Map.of(
            "type", "message_deleted", "message_id", messageId, "room_id", msg.getRoomId()));
    }

    @Transactional
    public Map<String, Object> toggleReaction(String messageId, String emoji, String userId) {
        Message msg = messageRepository.findById(messageId)
                .orElseThrow(() -> new MessageNotFoundException(messageId));
        Optional<Reaction> existing = reactionRepository.findByMessageIdAndUserIdAndEmoji(messageId, userId, emoji);
        String action;
        if (existing.isPresent()) {
            reactionRepository.delete(existing.get());
            action = "remove";
        } else {
            reactionRepository.save(Reaction.builder().messageId(messageId).userId(userId).emoji(emoji).build());
            action = "add";
        }
        Map<String, Object> payload = Map.of(
            "type", "reaction", "message_id", messageId,
            "emoji", emoji, "user_id", userId, "action", action, "room_id", msg.getRoomId());
        wsHandler.broadcastToRoom(msg.getRoomId(), payload);
        return Map.of("action", action, "emoji", emoji);
    }

    public String getDmRoomId(String u1, String u2) {
        return generateDMRoomId(u1, u2);
    }

    public String generateDMRoomId(String userId1, String userId2) {
        if (userId1.equals(userId2)) {
            throw new UnauthorizedException("Can't DM yourself");
        }
        List<String> ids = Arrays.asList(userId1, userId2);
        Collections.sort(ids);
        return "dm_" + ids.get(0) + "_" + ids.get(1);
    }

    public List<MessageDto> getDMMessages(String userId1, String userId2, int limit) {
        userRepository.findById(userId1).orElseThrow(() -> new UserNotFoundException(userId1));
        userRepository.findById(userId2).orElseThrow(() -> new UserNotFoundException(userId2));
        return getRoomMessages(generateDMRoomId(userId1, userId2), limit);
    }

    public List<Map<String, Object>> getUserDMConversations(String userId) {
        userRepository.findById(userId).orElseThrow(() -> new UserNotFoundException(userId));
        List<String> roomIds = messageRepository.findDmRoomIdsByUserId(userId);
        List<Map<String, Object>> result = new ArrayList<>();
        for (String roomId : roomIds) {
            String[] parts = roomId.split("_", 3);
            if (parts.length != 3) continue;
            String otherId = parts[1].equals(userId) ? parts[2] : parts[1];
            userRepository.findById(otherId).ifPresent(other -> {
                UserDto u = UserDto.from(other);
                u.setIsOnline(wsHandler.isOnline(otherId));
                List<Message> lastMsgs = messageRepository.findByRoomIdDesc(roomId, PageRequest.of(0, 1));
                Map<String, Object> entry = new LinkedHashMap<>();
                entry.put("id", u.getId());
                entry.put("username", u.getUsername());
                entry.put("displayName", u.getDisplayName());
                entry.put("avatarUrl", u.getAvatarUrl());
                entry.put("isOnline", u.getIsOnline());
                entry.put("room_id", roomId);
                if (!lastMsgs.isEmpty()) {
                    Message last = lastMsgs.get(0);
                    entry.put("last_message_preview", last.getContent().substring(0, Math.min(80, last.getContent().length())));
                    entry.put("last_message_at", last.getCreatedAt());
                }
                result.add(entry);
            });
        }
        result.sort((a, b) -> {
            Object at = a.get("last_message_at");
            Object bt = b.get("last_message_at");
            if (at == null && bt == null) return 0;
            if (at == null) return 1;
            if (bt == null) return -1;
            return bt.toString().compareTo(at.toString());
        });
        return result;
    }

    public List<Map<String, Object>> getDmList(String userId, ChatWebSocketHandler wsHandler) {
        return getUserDMConversations(userId);
    }
}
