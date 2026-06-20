package com.parlance.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "messages")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Message {
    @Id @UuidGenerator @Column(length = 36)
    private String id;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "sender_id", nullable = false, length = 36)
    private String senderId;

    @Column(name = "room_type", length = 50, nullable = false)
    private String roomType;

    @Column(name = "room_id", length = 100, nullable = false)
    private String roomId;

    @Column(name = "reply_to", length = 36)
    private String replyTo;

    @Column(name = "is_deleted") @Builder.Default
    private Boolean isDeleted = false;

    @Column(name = "edited_at")
    private Instant editedAt;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "message_mentions", joinColumns = @JoinColumn(name = "message_id"))
    @Column(name = "user_id", length = 36)
    @Builder.Default
    private List<String> mentionUserIds = new ArrayList<>();

    @Column(name = "created_at") @Builder.Default
    private Instant createdAt = null;

    @PrePersist
    protected void onCreate() {
        if(createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
