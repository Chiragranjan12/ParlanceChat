package com.parlance.controller;

import com.parlance.dto.MessageDto;
import com.parlance.dto.MessageRequestDto;
import com.parlance.model.User;
import com.parlance.service.MessageService;
import com.parlance.websocket.ChatWebSocketHandler;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class MessageController {

    private final MessageService messageService;
    private final ChatWebSocketHandler wsHandler;

    @PostMapping("/messages")
    public MessageDto sendMessage(@Valid @RequestBody MessageRequestDto.SendMessage req,
                                  @AuthenticationPrincipal User user) {
        return messageService.sendMessage(req, user.getId());
    }

    @PutMapping("/messages/{messageId}")
    public MessageDto editMessage(@PathVariable String messageId,
                                  @RequestBody MessageRequestDto.EditMessage req,
                                  @AuthenticationPrincipal User user) {
        return messageService.editMessage(messageId, req.getContent(), user.getId());
    }

    @DeleteMapping("/messages/{messageId}")
    public Map<String, String> deleteMessage(@PathVariable String messageId,
                                             @AuthenticationPrincipal User user) {
        messageService.deleteMessage(messageId, user.getId());
        return Map.of("message", "Deleted");
    }

    @PostMapping("/messages/{messageId}/reactions")
    public Map<String, Object> toggleReaction(@PathVariable String messageId,
                                              @RequestBody MessageRequestDto.AddReaction req,
                                              @AuthenticationPrincipal User user) {
        return messageService.toggleReaction(messageId, req.getEmoji(), user.getId());
    }

    @GetMapping("/presence")
    public Map<String, Object> getPresence(@AuthenticationPrincipal User user) {
        return Map.of("online_users", wsHandler.getOnlineUsers());
    }

    @PutMapping("/presence/status")
    public Map<String, String> updateStatus(@RequestBody Map<String, String> body,
                                            @AuthenticationPrincipal User user) {
        String status = body.getOrDefault("status", "online");
        wsHandler.broadcastAll(Map.of("type", "presence", "user_id", user.getId(), "status", status));
        return Map.of("status", status);
    }
}
