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
@RequestMapping("/api/dm")
@RequiredArgsConstructor
public class DmController {

    private final MessageService messageService;
    private final ChatWebSocketHandler wsHandler;

    @GetMapping("/list")
    public List<Map<String, Object>> listDms(@AuthenticationPrincipal User user) {
        return messageService.getDmList(user.getId(), wsHandler);
    }

    @GetMapping("/{otherUserId}/messages")
    public List<MessageDto> getDmMessages(@PathVariable String otherUserId,
                                          @RequestParam(defaultValue = "50") int limit,
                                          @AuthenticationPrincipal User user) {
        String roomId = messageService.getDmRoomId(user.getId(), otherUserId);
        return messageService.getRoomMessages(roomId, limit);
    }

    @PostMapping
    public MessageDto sendDm(@Valid @RequestBody MessageRequestDto.SendDm req,
                             @AuthenticationPrincipal User user) {
        return messageService.sendDm(req, user.getId());
    }
}
