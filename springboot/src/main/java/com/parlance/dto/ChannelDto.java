package com.parlance.dto;

import lombok.Data;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class ChannelDto {
    @Data
    public static class CreateRequest {
        @NotBlank(message = "Channel name is required")
        @Size(max = 255, message = "Channel name must not exceed 255 characters")
        private String name;

        @Size(max = 1000, message = "Channel description must not exceed 1000 characters")
        private String description = "";

        @Pattern(regexp = "^(public|private|broadcast)$", message = "Channel type must be 'public', 'private', or 'broadcast'")
        private String channelType = "public";
    }

    @Data
    public static class Response {
        private String id;
        private String name;
        private String description;
        private String channelType;
        private String createdBy;
        private java.time.Instant createdAt;
        private Long memberCount;
        private Boolean isMember;
    }
}
