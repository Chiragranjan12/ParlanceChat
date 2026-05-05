package com.parlance.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;
import java.time.Instant;

@Entity
@Table(name = "channels")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Channel {
    @Id @UuidGenerator @Column(length = 36)
    private String id;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(length = 1000) @Builder.Default
    private String description = "";

    @Column(name = "channel_type", length = 20) @Builder.Default
    private String channelType = "public";

    @Column(name = "created_by")
    private String createdBy;

    @Column(name = "created_at") @Builder.Default
    private Instant createdAt = Instant.now();
}
