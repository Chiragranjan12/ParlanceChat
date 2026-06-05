package com.parlance.controller;

import com.parlance.dto.ChannelDto;
import com.parlance.dto.MessageDto;
import com.parlance.dto.UserDto;
import com.parlance.exception.UserNotMemberException;
import com.parlance.model.Channel;
import com.parlance.model.User;
import com.parlance.repository.ChannelMemberRepository;
import com.parlance.service.ChannelService;
import com.parlance.service.MessageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/channels")
@RequiredArgsConstructor
public class ChannelController {

    private final ChannelService channelService;
    private final MessageService messageService;
    private final ChannelMemberRepository channelMemberRepository;

    @GetMapping
    public List<ChannelDto.Response> allChannels(@AuthenticationPrincipal User user) {
        return channelService.getAllChannels(user.getId());
    }

    @GetMapping("/mine")
    public List<ChannelDto.Response> myChannels(@AuthenticationPrincipal User user) {
        return channelService.getMyChannels(user.getId());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Channel createChannel(@Valid @RequestBody ChannelDto.CreateRequest req,
                                 @AuthenticationPrincipal User user) {
        return channelService.createChannel(req, user.getId());
    }

    @PostMapping("/{channelId}/join")
    public Map<String, String> join(@PathVariable String channelId, @AuthenticationPrincipal User user) {
        channelService.joinChannel(channelId, user.getId());
        return Map.of("message", "Joined successfully");
    }

    @DeleteMapping("/{channelId}/leave")
    public Map<String, String> leave(@PathVariable String channelId, @AuthenticationPrincipal User user) {
        channelService.leaveChannel(channelId, user.getId());
        return Map.of("message", "Left channel");
    }

    @GetMapping("/{channelId}/members")
    public List<UserDto> members(@PathVariable String channelId, @AuthenticationPrincipal User user) {
        return channelService.getMembers(channelId);
    }

    @GetMapping("/{channelId}/messages")
    public List<MessageDto> messages(@PathVariable String channelId,
                                     @RequestParam(defaultValue = "50") int limit,
                                     @AuthenticationPrincipal User user) {
        if (!channelMemberRepository.existsByChannelIdAndUserId(channelId, user.getId()))
            throw new UserNotMemberException(user.getId(), channelId, "channel");
        return messageService.getRoomMessages(channelId, limit);
    }
}
