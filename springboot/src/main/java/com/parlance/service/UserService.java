package com.parlance.service;

import com.parlance.dto.UserDto;
import com.parlance.exception.UserNotFoundException;
import com.parlance.model.User;
import com.parlance.repository.UserRepository;
import com.parlance.websocket.ChatWebSocketHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final ChatWebSocketHandler wsHandler;

    public List<UserDto> searchUsers(String query, String currentUserId) {
        String normalized = query == null ? "" : query.trim();
        return userRepository.searchUsers(normalized, currentUserId, PageRequest.of(0, 20))
                .stream()
                .map(this::toDtoWithPresence)
                .toList();
    }

    public List<UserDto> getAllUsersExcept(String currentUserId) {
        return userRepository.findByIdNotOrderByUsernameAsc(currentUserId)
                .stream()
                .limit(20)
                .map(this::toDtoWithPresence)
                .toList();
    }

    public UserDto getUserById(String userId) {
        return userRepository.findById(userId)
                .map(this::toDtoWithPresence)
                .orElseThrow(() -> new UserNotFoundException(userId));
    }

    private UserDto toDtoWithPresence(User user) {
        UserDto dto = UserDto.from(user);
        dto.setIsOnline(wsHandler.isOnline(user.getId()));
        return dto;
    }
}
