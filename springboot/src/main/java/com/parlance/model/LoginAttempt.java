package com.parlance.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import com.fasterxml.jackson.annotation.JsonIgnore;

import java.time.Instant;

@Entity
@Table(name = "login_attempts")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class LoginAttempt {
    @Id @UuidGenerator @Column(length = 36)
    private String id;

    @JsonIgnore
    @Column(nullable = false, unique = true)
    private String identifier;

    @JsonIgnore
    @Builder.Default
    private int count = 0;

    @JsonIgnore
    @Column(name = "last_attempt")
    private Instant lastAttempt;
}
