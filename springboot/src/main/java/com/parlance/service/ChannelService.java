package com.parlance.service;

import com.parlance.dto.*;
import com.parlance.model.*;
import com.parlance.repository.*;
import com.parlance.websocket.ChatWebSocketHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChannelService {

    private final ChannelRepository channelRepository;
    private final ChannelMemberRepository channelMemberRepository;
    private final UserRepository userRepository;
    private final ChatWebSocketHandler wsHandler;

    public List<ChannelDto.Response> getAllChannels(String userId) {
        return channelRepository.findAll().stream().map(ch -> toResponse(ch, userId)).collect(Collectors.toList());
    }

    public List<ChannelDto.Response> getMyChannels(String userId) {
        List<String> channelIds = channelMemberRepository.findByUserId(userId)
                .stream().map(ChannelMember::getChannelId).collect(Collectors.toList());
        return channelRepository.findAllById(channelIds).stream()
                .map(ch -> toResponse(ch, userId)).collect(Collectors.toList());
    }

    @Transactional
    public Channel createChannel(ChannelDto.CreateRequest req, String userId) {
        String name = req.getName().toLowerCase().trim().replaceAll("\\s+", "-");
        if (channelRepository.existsByName(name))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Channel name already exists");
        Channel ch = channelRepository.save(Channel.builder()
                .name(name).description(req.getDescription()).channelType(req.getChannelType())
                .createdBy(userId).build());
        channelMemberRepository.save(ChannelMember.builder()
                .channelId(ch.getId()).userId(userId).role("admin").build());
        // Subscribe creator to WS room
        wsHandler.subscribeUserToRoom(userId, ch.getId());
        return ch;
    }

    @Transactional
    public void joinChannel(String channelId, String userId) {
        if (!channelRepository.existsById(channelId))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Channel not found");
        if (!channelMemberRepository.existsByChannelIdAndUserId(channelId, userId)) {
            channelMemberRepository.save(ChannelMember.builder()
                    .channelId(channelId).userId(userId).role("member").build());
            wsHandler.subscribeUserToRoom(userId, channelId);
        }
    }

    @Transactional
    public void leaveChannel(String channelId, String userId) {
        channelMemberRepository.deleteByChannelIdAndUserId(channelId, userId);
    }

    public List<UserDto> getMembers(String channelId) {
        return channelMemberRepository.findByChannelId(channelId).stream()
                .map(m -> userRepository.findById(m.getUserId()).map(u -> {
                    UserDto dto = UserDto.from(u);
                    dto.setIsOnline(wsHandler.isOnline(u.getId()));
                    return dto;
                }).orElse(null))
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    private ChannelDto.Response toResponse(Channel ch, String userId) {
        ChannelDto.Response r = new ChannelDto.Response();
        r.setId(ch.getId()); r.setName(ch.getName());
        r.setDescription(ch.getDescription()); r.setChannelType(ch.getChannelType());
        r.setCreatedBy(ch.getCreatedBy()); r.setCreatedAt(ch.getCreatedAt());
        r.setMemberCount(channelMemberRepository.countByChannelId(ch.getId()));
        r.setIsMember(channelMemberRepository.existsByChannelIdAndUserId(ch.getId(), userId));
        return r;
    }
}
