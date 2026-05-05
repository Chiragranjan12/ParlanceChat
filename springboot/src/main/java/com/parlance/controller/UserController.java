package com.parlance.controller;

import com.parlance.dto.UserDto;
import com.parlance.model.User;
import com.parlance.repository.UserRepository;
import com.parlance.websocket.ChatWebSocketHandler;
import lombok.RequiredArgsConstructor;
import lombok.Data;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final ChatWebSocketHandler wsHandler;

    @GetMapping
    public List<UserDto> searchUsers(@RequestParam(defaultValue = "") String q,
                                     @AuthenticationPrincipal User user) {
        List<User> users = q.isEmpty()
                ? userRepository.findAll()
                : userRepository.findByDisplayNameContainingIgnoreCaseOrUsernameContainingIgnoreCase(q, q);
        return users.stream().map(u -> {
            UserDto dto = UserDto.from(u);
            dto.setIsOnline(wsHandler.isOnline(u.getId()));
            return dto;
        }).limit(50).collect(Collectors.toList());
    }

    @GetMapping("/me")
    public User getMe(@AuthenticationPrincipal User user) {
        if (user == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        return user;
    }

    @PutMapping("/me")
    public UserDto updateMe(@RequestBody UpdateProfileRequest req, @AuthenticationPrincipal User user) {
        if (user == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        if (req.getDisplayName() != null) user.setDisplayName(req.getDisplayName());
        if (req.getBio() != null) user.setBio(req.getBio());
        if (req.getAvatarUrl() != null) user.setAvatarUrl(req.getAvatarUrl());
        return UserDto.from(userRepository.save(user));
    }

    @GetMapping("/{userId}")
    public UserDto getUser(@PathVariable String userId, @AuthenticationPrincipal User user) {
        User target = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        UserDto dto = UserDto.from(target);
        dto.setIsOnline(wsHandler.isOnline(userId));
        return dto;
    }

    @Data
    static class UpdateProfileRequest {
        private String displayName;
        private String bio;
        private String avatarUrl;
    }
}
