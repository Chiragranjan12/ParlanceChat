package com.parlance.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;
import java.time.Instant;

@Entity
@Table(name = "channel_members",
       uniqueConstraints = @UniqueConstraint(columnNames = {"channel_id", "user_id"}))
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class ChannelMember {
    @Id @UuidGenerator @Column(length = 36)
    private String id;

    @Column(name = "channel_id", nullable = false)
    private String channelId;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(length = 20) @Builder.Default
    private String role = "member";

    @Column(name = "joined_at") @Builder.Default
    private Instant joinedAt = Instant.now();
}
