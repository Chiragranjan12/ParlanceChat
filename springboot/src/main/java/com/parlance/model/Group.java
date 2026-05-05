package com.parlance.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;
import java.time.Instant;

@Entity
@Table(name = "groups_table")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Group {
    @Id @UuidGenerator @Column(length = 36)
    private String id;

    @Column(nullable = false)
    private String name;

    @Column(length = 1000) @Builder.Default
    private String description = "";

    @Column(name = "created_by")
    private String createdBy;

    @Column(name = "created_at") @Builder.Default
    private Instant createdAt = Instant.now();
}
