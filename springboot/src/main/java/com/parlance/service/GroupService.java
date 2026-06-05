package com.parlance.service;

import com.parlance.dto.*;
import com.parlance.exception.UserNotMemberException;
import com.parlance.model.*;
import com.parlance.repository.*;
import com.parlance.websocket.ChatWebSocketHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GroupService {

    private final GroupRepository groupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final UserRepository userRepository;
    private final ChatWebSocketHandler wsHandler;

    public List<Group> getMyGroups(String userId) {
        List<String> groupIds = groupMemberRepository.findByUserId(userId)
                .stream().map(GroupMember::getGroupId).collect(Collectors.toList());
        return groupRepository.findAllById(groupIds);
    }

    @Transactional
    public Group createGroup(GroupDto.CreateRequest req, String userId) {
        Group group = groupRepository.save(Group.builder()
                .name(req.getName()).description(req.getDescription()).createdBy(userId).build());
        groupMemberRepository.save(GroupMember.builder()
                .groupId(group.getId()).userId(userId).role("admin").build());
        for (String memberId : req.getMemberIds()) {
            if (!memberId.equals(userId)) {
                try {
                    groupMemberRepository.save(GroupMember.builder()
                            .groupId(group.getId()).userId(memberId).role("member").build());
                } catch (Exception ignored) {}
            }
        }
        wsHandler.subscribeUserToRoom(userId, group.getId());
        return group;
    }

    public List<UserDto> getMembers(String groupId, String requestingUserId) {
        if (!groupMemberRepository.existsByGroupIdAndUserId(groupId, requestingUserId))
            throw new UserNotMemberException(requestingUserId, groupId, "group");
        return groupMemberRepository.findByGroupId(groupId).stream()
                .map(m -> userRepository.findById(m.getUserId()).map(u -> {
                    UserDto dto = UserDto.from(u);
                    dto.setIsOnline(wsHandler.isOnline(u.getId()));
                    return dto;
                }).orElse(null))
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    public boolean isMember(String groupId, String userId) {
        return groupMemberRepository.existsByGroupIdAndUserId(groupId, userId);
    }
}
