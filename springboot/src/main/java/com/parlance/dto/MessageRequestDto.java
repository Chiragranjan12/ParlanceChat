package com.parlance.dto;

import lombok.Data;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class MessageRequestDto {
    @Data
    public static class SendMessage {
        @NotBlank(message = "Message content is required")
        @Size(max = 5000, message = "Message must not exceed 5000 characters")
        private String content;

        @NotBlank(message = "Room type is required")
        @Pattern(regexp = "^(channel|group)$", message = "Room type must be 'channel' or 'group'")
        private String roomType;

        @NotBlank(message = "Room ID is required")
        @Size(max = 100, message = "Room ID must not exceed 100 characters")
        private String roomId;

        @Size(max = 100, message = "Reply message ID must not exceed 100 characters")
        private String replyTo;
    }

    @Data
    public static class SendDm {
        @NotBlank(message = "Recipient ID is required")
        @Size(max = 100, message = "Recipient ID must not exceed 100 characters")
        private String recipientId;

        @NotBlank(message = "Message content is required")
        @Size(max = 5000, message = "Message must not exceed 5000 characters")
        private String content;

        @Size(max = 100, message = "Reply message ID must not exceed 100 characters")
        private String replyTo;
    }

    @Data
    public static class EditMessage {
        @NotBlank(message = "Message content is required")
        @Size(max = 5000, message = "Message must not exceed 5000 characters")
        private String content;
    }

    @Data
    public static class AddReaction {
        @NotBlank(message = "Emoji is required")
        @Size(max = 64, message = "Emoji must not exceed 64 characters")
        private String emoji;
    }
}
