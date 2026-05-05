package com.parlance.dto;

import lombok.Data;
import jakarta.validation.constraints.NotBlank;

public class MessageRequestDto {
    @Data
    public static class SendMessage {
        @NotBlank private String content;
        @NotBlank private String roomType;
        @NotBlank private String roomId;
        private String replyTo;
    }

    @Data
    public static class SendDm {
        @NotBlank private String recipientId;
        @NotBlank private String content;
        private String replyTo;
    }

    @Data
    public static class EditMessage {
        @NotBlank private String content;
    }

    @Data
    public static class AddReaction {
        @NotBlank private String emoji;
    }
}
