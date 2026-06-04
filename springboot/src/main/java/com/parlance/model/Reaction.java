package com.parlance.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;
import java.time.Instant;

@Entity
@Table(name = "reactions",
       uniqueConstraints = @UniqueConstraint(columnNames = {"message_id", "user_id", "emoji"}))
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Reaction {
    @Id @UuidGenerator @Column(length = 36)
    private String id;

    @Column(name = "message_id", nullable = false, length = 36)
    private String messageId;

    @Column(name = "user_id", nullable = false, length = 36)
    private String userId;

    @Column(nullable = false, length = 10)
    private String emoji;

    @Column(name = "created_at") @Builder.Default
    private Instant createdAt = null;

    @PrePersist
    protected void onCreate() {
        if(createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
