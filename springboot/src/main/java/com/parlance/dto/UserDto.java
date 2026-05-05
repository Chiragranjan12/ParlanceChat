package com.parlance.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.parlance.model.User;
import lombok.Data;
import java.time.Instant;

@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UserDto {
    private String id;
    private String email;
    private String username;
    private String displayName;
    private String avatarUrl;
    private String bio;
    private String status;
    private String role;
    private Instant createdAt;
    private Instant lastSeen;
    private Boolean isOnline;

    public static UserDto from(User u) {
        UserDto dto = new UserDto();
        dto.id = u.getId();
        dto.email = u.getEmail();
        dto.username = u.getUsername();
        dto.displayName = u.getDisplayName();
        dto.avatarUrl = u.getAvatarUrl();
        dto.bio = u.getBio();
        dto.status = u.getStatus();
        dto.role = u.getRole();
        dto.createdAt = u.getCreatedAt();
        dto.lastSeen = u.getLastSeen();
        return dto;
    }
}
