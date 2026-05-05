package com.parlance.dto;

import lombok.Data;
import jakarta.validation.constraints.NotBlank;
import java.util.List;

public class ChannelDto {
    @Data
    public static class CreateRequest {
        @NotBlank private String name;
        private String description = "";
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
