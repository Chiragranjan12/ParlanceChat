package com.parlance.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;
import java.time.Instant;
import java.util.List;
import java.util.Map;

@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class MessageDto {
    private String id;
    private String content;
    private String senderId;
    private String roomType;
    private String roomId;
    private String replyTo;
    private Boolean isDeleted;
    private Instant editedAt;
    private Instant createdAt;
    private UserDto sender;
    private List<String> mentionUserIds;
    private Map<String, ReactionInfo> reactions;
    private ReplyPreview replyPreview;

    @Data
    public static class ReactionInfo {
        private int count;
        private java.util.List<String> users;
    }

    @Data
    public static class ReplyPreview {
        private String content;
        private String senderName;
    }
}
