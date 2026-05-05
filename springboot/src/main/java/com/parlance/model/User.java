package com.parlance.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;
import java.time.Instant;

@Entity
@Table(name = "users")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class User {
    @Id @UuidGenerator @Column(length = 36)
    private String id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false, unique = true)
    private String username;

    @Column(name = "display_name")
    private String displayName;

    @JsonIgnore
    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "avatar_url")
    private String avatarUrl;

    @Column(length = 500) @Builder.Default
    private String bio = "";

    @Column(length = 20) @Builder.Default
    private String status = "offline";

    @Column(length = 20) @Builder.Default
    private String role = "user";

    @Column(name = "created_at") @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "last_seen") @Builder.Default
    private Instant lastSeen = Instant.now();
}
