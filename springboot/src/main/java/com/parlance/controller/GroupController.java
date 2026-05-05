package com.parlance.controller;

import com.parlance.dto.GroupDto;
import com.parlance.dto.MessageDto;
import com.parlance.dto.UserDto;
import com.parlance.model.Group;
import com.parlance.model.User;
import com.parlance.service.GroupService;
import com.parlance.service.MessageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/groups")
@RequiredArgsConstructor
public class GroupController {

    private final GroupService groupService;
    private final MessageService messageService;

    @GetMapping
    public List<Group> myGroups(@AuthenticationPrincipal User user) {
        return groupService.getMyGroups(user.getId());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Group createGroup(@Valid @RequestBody GroupDto.CreateRequest req,
                             @AuthenticationPrincipal User user) {
        return groupService.createGroup(req, user.getId());
    }

    @GetMapping("/{groupId}/members")
    public List<UserDto> members(@PathVariable String groupId, @AuthenticationPrincipal User user) {
        return groupService.getMembers(groupId, user.getId());
    }

    @GetMapping("/{groupId}/messages")
    public List<MessageDto> messages(@PathVariable String groupId,
                                     @RequestParam(defaultValue = "50") int limit,
                                     @AuthenticationPrincipal User user) {
        if (!groupService.isMember(groupId, user.getId()))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not a member");
        return messageService.getRoomMessages(groupId, limit);
    }
}
