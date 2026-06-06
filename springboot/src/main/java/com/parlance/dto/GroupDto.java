package com.parlance.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;

public class GroupDto {
    @Data @NoArgsConstructor @AllArgsConstructor
    public static class CreateRequest {
        @NotBlank(message = "Group name is required")
        @Size(min = 1, max = 255, message = "Group name must be between 1 and 255 characters")
        private String name;

        @Size(max = 1000, message = "Group description must not exceed 1000 characters")
        private String description = "";

        @NotEmpty(message = "At least 2 members required (creator + 1 other)")
        @Size(max = 100, message = "Group can have up to 100 members")
        private List<String> memberIds = List.of();
    }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class UpdateRequest {
        @NotBlank(message = "Group name is required")
        @Size(min = 1, max = 255, message = "Group name must be between 1 and 255 characters")
        private String name;

        @Size(max = 1000, message = "Group description must not exceed 1000 characters")
        private String description = "";
    }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class AddMemberRequest {
        @NotBlank(message = "User ID is required")
        private String userId;
    }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class GroupResponse {
        private String id;
        private String name;
        private String description;
        private String createdBy;
        private Instant createdAt;
        private Instant updatedAt;
        private Long memberCount;
        private String lastMessage;
        private Instant lastMessageTime;
        private Boolean isActive;
        private String currentUserRole; // "admin" or "member"
    }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class GroupMemberResponse {
        private String id;
        private String userId;
        private String username;
        private String displayName;
        private String avatarUrl;
        private String role; // "admin" or "member"
        private Instant joinedAt;
        private Boolean isOnline;
    }
}
