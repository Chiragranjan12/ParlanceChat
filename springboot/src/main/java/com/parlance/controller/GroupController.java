package com.parlance.controller;

import com.parlance.dto.GroupDto;
import com.parlance.dto.MessageDto;
import com.parlance.model.Group;
import com.parlance.model.User;
import com.parlance.service.GroupService;
import com.parlance.service.MessageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST Controller for group chat operations
 */
@RestController
@RequestMapping("/api/groups")
@RequiredArgsConstructor
public class GroupController {

    private final GroupService groupService;
    private final MessageService messageService;

    /**
     * GET /api/groups - Get all groups user is member of
     */
    @GetMapping
    public List<Group> myGroups(@AuthenticationPrincipal User user) {
        return groupService.getMyGroups(user.getId());
    }

    /**
     * POST /api/groups - Create new group
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Group createGroup(@Valid @RequestBody GroupDto.CreateRequest req,
                             @AuthenticationPrincipal User user) {
        return groupService.createGroup(req, user.getId());
    }

    /**
     * GET /api/groups/{groupId} - Get group details
     */
    @GetMapping("/{groupId}")
    public Group getGroup(@PathVariable String groupId,
                         @AuthenticationPrincipal User user) {
        return groupService.getGroupById(groupId);
    }

    /**
     * PUT /api/groups/{groupId} - Update group (admin only)
     */
    @PutMapping("/{groupId}")
    public Group updateGroup(@PathVariable String groupId,
                            @Valid @RequestBody GroupDto.UpdateRequest req,
                            @AuthenticationPrincipal User user) {
        return groupService.updateGroup(groupId, req, user.getId());
    }

    /**
     * DELETE /api/groups/{groupId} - Delete group (admin only)
     */
    @DeleteMapping("/{groupId}")
    public Map<String, String> deleteGroup(@PathVariable String groupId,
                                           @AuthenticationPrincipal User user) {
        groupService.deleteGroup(groupId, user.getId());
        return Map.of("message", "Group deleted successfully");
    }

    /**
     * GET /api/groups/{groupId}/members - Get group members
     */
    @GetMapping("/{groupId}/members")
    public List<GroupDto.GroupMemberResponse> getMembers(@PathVariable String groupId,
                                                         @AuthenticationPrincipal User user) {
        return groupService.getMembers(groupId, user.getId());
    }

    /**
     * POST /api/groups/{groupId}/members - Add member (admin only)
     */
    @PostMapping("/{groupId}/members")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, String> addMember(@PathVariable String groupId,
                                         @Valid @RequestBody GroupDto.AddMemberRequest req,
                                         @AuthenticationPrincipal User user) {
        groupService.addMemberToGroup(groupId, req.getUserId(), user.getId());
        return Map.of("message", "Member added successfully");
    }

    /**
     * DELETE /api/groups/{groupId}/members/{memberId} - Remove member (admin only)
     */
    @DeleteMapping("/{groupId}/members/{memberId}")
    public Map<String, String> removeMember(@PathVariable String groupId,
                                            @PathVariable String memberId,
                                            @AuthenticationPrincipal User user) {
        groupService.removeMemberFromGroup(groupId, memberId, user.getId());
        return Map.of("message", "Member removed successfully");
    }

    /**
     * POST /api/groups/{groupId}/leave - Leave group
     */
    @PostMapping("/{groupId}/leave")
    public Map<String, String> leaveGroup(@PathVariable String groupId,
                                          @AuthenticationPrincipal User user) {
        groupService.leaveGroup(groupId, user.getId());
        return Map.of("message", "Left group successfully");
    }

    /**
     * GET /api/groups/{groupId}/messages - Get group messages
     */
    @GetMapping("/{groupId}/messages")
    public List<MessageDto> getGroupMessages(@PathVariable String groupId,
                                            @RequestParam(defaultValue = "50") int limit,
                                            @AuthenticationPrincipal User user) {
        // Verify user is member
        if (!groupService.isMember(groupId, user.getId())) {
            throw new com.parlance.exception.UserNotMemberException(user.getId(), groupId, "group");
        }
        return messageService.getRoomMessages(groupId, limit);
    }
}
