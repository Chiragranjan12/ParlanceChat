package com.parlance.service;

import com.parlance.dto.*;
import com.parlance.exception.*;
import com.parlance.model.*;
import com.parlance.model.GroupMember.GroupRole;
import com.parlance.repository.*;
import com.parlance.websocket.ChatWebSocketHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for managing group chat operations
 */
@Service
@RequiredArgsConstructor
public class GroupService {

    private final GroupRepository groupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final UserRepository userRepository;
    private final MessageRepository messageRepository;
    private final ChatWebSocketHandler wsHandler;

    /**
     * Get all groups user is a member of
     */
    public List<Group> getMyGroups(String userId) {
        List<String> groupIds = groupMemberRepository.findByUserId(userId)
                .stream()
                .map(GroupMember::getGroupId)
                .collect(Collectors.toList());
        if (groupIds.isEmpty()) return Collections.emptyList();
        // Ensure we only return active groups
        return groupRepository.findAllById(groupIds)
            .stream()
            .filter(g -> Boolean.TRUE.equals(g.getIsActive()))
            .collect(Collectors.toList());
    }

    /**
     * Create a new group
     * Creator is automatically added as ADMIN
     * All other members are added as MEMBER
     */
    @Transactional
    public Group createGroup(GroupDto.CreateRequest req, String userId) {
        // Validation: creator must be in memberIds
        if (!req.getMemberIds().contains(userId)) {
            req.getMemberIds().add(userId);
        }

        // Validation: minimum 2 members (creator + at least 1 other)
        if (req.getMemberIds().size() < 2) {
            throw new IllegalArgumentException("Group must have at least 2 members (creator + at least 1 other)");
        }

        // Validation: maximum 100 members
        if (req.getMemberIds().size() > 100) {
            throw new IllegalArgumentException("Group can have maximum 100 members");
        }

        // Create group
        Group group = groupRepository.save(Group.builder()
                .name(req.getName())
                .description(req.getDescription() != null ? req.getDescription() : "")
                .createdBy(userId)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .isActive(true)
                .build());

        // Add creator as ADMIN
        groupMemberRepository.save(GroupMember.builder()
                .groupId(group.getId())
                .userId(userId)
                .role(GroupRole.ADMIN)
                .joinedAt(Instant.now())
                .isActive(true)
                .build());

        // Add other members as MEMBER
        for (String memberId : req.getMemberIds()) {
            if (!memberId.equals(userId)) {
                // Skip if already added (defensive)
                if (groupMemberRepository.existsByGroupIdAndUserId(group.getId(), memberId)) continue;
                groupMemberRepository.save(GroupMember.builder()
                        .groupId(group.getId())
                        .userId(memberId)
                        .role(GroupRole.MEMBER)
                        .joinedAt(Instant.now())
                        .isActive(true)
                        .build());
            }
        }

        // Subscribe creator to room
        wsHandler.subscribeUserToRoom(userId, group.getId());

        return group;
    }

    /**
     * Get group details
     */
    public Group getGroupById(String groupId) {
        return groupRepository.findByIdActive(groupId)
                .orElseThrow(() -> new GroupNotFoundException(groupId));
    }

    /**
     * Update group (admin only)
     */
    @Transactional
    public Group updateGroup(String groupId, GroupDto.UpdateRequest req, String adminId) {
        Group group = getGroupById(groupId);
        
        // Verify admin
        if (!groupMemberRepository.isAdmin(groupId, adminId, GroupRole.ADMIN)) {
            throw new UnauthorizedException("Only group admin can update group");
        }

        group.setName(req.getName());
        group.setDescription(req.getDescription() != null ? req.getDescription() : "");
        group.setUpdatedAt(Instant.now());

        return groupRepository.save(group);
    }

    /**
     * Get all members of a group
     */
    public List<GroupDto.GroupMemberResponse> getMembers(String groupId, String requestingUserId) {
        // Verify requesting user is member
        if (!groupMemberRepository.existsByGroupIdAndUserId(groupId, requestingUserId)) {
            throw new UserNotMemberException(requestingUserId, groupId, "group");
        }

        List<GroupMember> members = groupMemberRepository.findByGroupId(groupId);
        
        return members.stream()
                .map(gm -> {
                    User user = userRepository.findById(gm.getUserId()).orElse(null);
                    if (user == null) return null;

                    GroupDto.GroupMemberResponse response = new GroupDto.GroupMemberResponse();
                    response.setId(gm.getId());
                    response.setUserId(user.getId());
                    response.setUsername(user.getUsername());
                    response.setDisplayName(user.getDisplayName());
                    response.setAvatarUrl(user.getAvatarUrl());
                    response.setRole(gm.getRole().toString().toLowerCase());
                    response.setJoinedAt(gm.getJoinedAt());
                    response.setIsOnline(wsHandler.isOnline(user.getId()));

                    return response;
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    /**
     * Add a member to group (admin only)
     */
    @Transactional
    public void addMemberToGroup(String groupId, String newUserId, String adminId) {
        // Verify group exists
        getGroupById(groupId);

        // Verify admin
        if (!groupMemberRepository.isAdmin(groupId, adminId, GroupRole.ADMIN)) {
            throw new UnauthorizedException("Only group admin can add members");
        }

        // Verify user exists
        userRepository.findById(newUserId)
                .orElseThrow(() -> new UserNotFoundException(newUserId));

        // Check if already member
        if (groupMemberRepository.existsByGroupIdAndUserId(groupId, newUserId)) {
            throw new DuplicateMemberException(groupId, newUserId);
        }

        // Add member
        groupMemberRepository.save(GroupMember.builder()
                .groupId(groupId)
                .userId(newUserId)
                .role(GroupRole.MEMBER)
                .joinedAt(Instant.now())
                .isActive(true)
                .build());

        // Subscribe new member to room
        wsHandler.subscribeUserToRoom(newUserId, groupId);

        // Broadcast notification
        wsHandler.broadcastToRoom(groupId, Map.of(
                "type", "member_joined",
                "user_id", newUserId,
                "timestamp", Instant.now().toEpochMilli()
        ));
    }

    /**
     * Remove a member from group (admin only, soft delete)
     */
    @Transactional
    public void removeMemberFromGroup(String groupId, String memberId, String adminId) {
        // Verify group exists
        getGroupById(groupId);

        // Verify admin
        if (!groupMemberRepository.isAdmin(groupId, adminId, GroupRole.ADMIN)) {
            throw new UnauthorizedException("Only group admin can remove members");
        }

        // Find member to remove
        GroupMember member = groupMemberRepository.findByGroupIdAndUserId(groupId, memberId)
                .orElseThrow(() -> new UserNotMemberException(memberId, groupId, "group"));

        // Don't allow removing the creator/last admin
        if (member.getRole() == GroupRole.ADMIN && groupMemberRepository.findByGroupId(groupId)
                .stream()
                .filter(m -> m.getRole() == GroupRole.ADMIN && Boolean.TRUE.equals(m.getIsActive()))
                .count() == 1) {
            throw new UnauthorizedException("Cannot remove the last admin from the group");
        }

        // Soft delete
        member.setIsActive(false);
        groupMemberRepository.save(member);

        // Unsubscribe from room
        wsHandler.unsubscribeUserFromRoom(memberId, groupId);

        // Broadcast notification
        wsHandler.broadcastToRoom(groupId, Map.of(
                "type", "member_removed",
                "user_id", memberId,
                "timestamp", Instant.now().toEpochMilli()
        ));
    }

    /**
     * User leaves group
     */
    @Transactional
    public void leaveGroup(String groupId, String userId) {
        // Verify group exists
        getGroupById(groupId);

        // Find member
        GroupMember member = groupMemberRepository.findByGroupIdAndUserId(groupId, userId)
                .orElseThrow(() -> new UserNotMemberException(userId, groupId, "group"));

        // Don't allow last admin to leave
        if (member.getRole() == GroupRole.ADMIN && groupMemberRepository.findByGroupId(groupId)
                .stream()
                .filter(m -> m.getRole() == GroupRole.ADMIN && Boolean.TRUE.equals(m.getIsActive()))
                .count() == 1) {
            throw new UnauthorizedException("You cannot leave the group as the only admin. Promote another member first.");
        }

        // Soft delete
        member.setIsActive(false);
        groupMemberRepository.save(member);

        // Unsubscribe from room
        wsHandler.unsubscribeUserFromRoom(userId, groupId);

        // Broadcast notification
        wsHandler.broadcastToRoom(groupId, Map.of(
                "type", "member_left",
                "user_id", userId,
                "timestamp", Instant.now().toEpochMilli()
        ));
    }

    /**
     * Delete entire group (admin only)
     */
    @Transactional
    public void deleteGroup(String groupId, String adminId) {
        // Verify group exists
        Group group = getGroupById(groupId);

        // Verify admin
        if (!groupMemberRepository.isAdmin(groupId, adminId, GroupRole.ADMIN)) {
            throw new UnauthorizedException("Only group admin can delete group");
        }

        // Soft delete group
        group.setIsActive(false);
        group.setUpdatedAt(Instant.now());
        groupRepository.save(group);

        // Soft delete all members
        groupMemberRepository.findByGroupId(groupId).forEach(member -> {
            member.setIsActive(false);
            groupMemberRepository.save(member);
            // Unsubscribe all members
            wsHandler.unsubscribeUserFromRoom(member.getUserId(), groupId);
        });

        // Broadcast deletion notification
        wsHandler.broadcastToRoom(groupId, Map.of(
                "type", "group_deleted",
                "group_id", groupId,
                "timestamp", Instant.now().toEpochMilli()
        ));
    }

    /**
     * Check if user is member of group
     */
    public boolean isMember(String groupId, String userId) {
        return groupMemberRepository.existsByGroupIdAndUserId(groupId, userId);
    }

    /**
     * Check if user is admin of group
     */
    public boolean isAdmin(String groupId, String userId) {
        return groupMemberRepository.isAdmin(groupId, userId, GroupRole.ADMIN);
    }

    /**
     * Get member count for group
     */
    public long getMemberCount(String groupId) {
        return groupMemberRepository.countByGroupId(groupId);
    }
}
