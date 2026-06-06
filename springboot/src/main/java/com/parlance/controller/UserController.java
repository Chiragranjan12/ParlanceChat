package com.parlance.controller;

import com.parlance.dto.UserDto;
import com.parlance.exception.UnauthorizedException;
import com.parlance.model.User;
import com.parlance.repository.UserRepository;
import com.parlance.service.UserService;
import com.parlance.websocket.ChatWebSocketHandler;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import lombok.Data;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final UserService userService;
    private final ChatWebSocketHandler wsHandler;

    @GetMapping
    public List<UserDto> searchUsers(@RequestParam(defaultValue = "") String q,
                                     @AuthenticationPrincipal User user) {
        return q.isBlank()
                ? userService.getAllUsersExcept(user.getId())
                : userService.searchUsers(q, user.getId());
    }

    @GetMapping("/search")
    public List<UserDto> searchUsersByQuery(@RequestParam(name = "query", defaultValue = "") String query,
                                            @AuthenticationPrincipal User user) {
        return userService.searchUsers(query, user.getId());
    }

    @GetMapping("/all")
    public List<UserDto> allAvailableUsers(@AuthenticationPrincipal User user) {
        return userService.getAllUsersExcept(user.getId());
    }

    @GetMapping("/me")
    public User getMe(@AuthenticationPrincipal User user) {
        if (user == null) throw new UnauthorizedException("Authentication required");
        return user;
    }

    @PutMapping("/me")
    public UserDto updateMe(@Valid @RequestBody UpdateProfileRequest req, @AuthenticationPrincipal User user) {
        if (user == null) throw new UnauthorizedException("Authentication required");
        if (req.getDisplayName() != null) user.setDisplayName(req.getDisplayName());
        if (req.getBio() != null) user.setBio(req.getBio());
        if (req.getAvatarUrl() != null) user.setAvatarUrl(req.getAvatarUrl());
        return UserDto.from(userRepository.save(user));
    }

    @GetMapping("/{userId}")
    public UserDto getUser(@PathVariable String userId, @AuthenticationPrincipal User user) {
        return userService.getUserById(userId);
    }

    @Data
    static class UpdateProfileRequest {
        @Size(min = 1, max = 255, message = "Display name must be between 1 and 255 characters")
        private String displayName;

        @Size(max = 5000, message = "Bio must not exceed 5000 characters")
        private String bio;

        @Size(max = 2000, message = "Avatar URL must not exceed 2000 characters")
        private String avatarUrl;
    }
}
