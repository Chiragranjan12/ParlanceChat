package com.parlance.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;
import java.time.Instant;

@Entity
@Table(name = "messages")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Message {
    @Id @UuidGenerator @Column(length = 36)
    private String id;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "sender_id", nullable = false)
    private String senderId;

    @Column(name = "room_type", length = 20)
    private String roomType;

    @Column(name = "room_id")
    private String roomId;

    @Column(name = "reply_to")
    private String replyTo;

    @Column(name = "is_deleted") @Builder.Default
    private Boolean isDeleted = false;

    @Column(name = "edited_at")
    private Instant editedAt;

    @Column(name = "created_at") @Builder.Default
    private Instant createdAt = Instant.now();
}
