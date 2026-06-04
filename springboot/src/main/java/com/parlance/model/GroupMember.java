package com.parlance.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import com.fasterxml.jackson.annotation.JsonIgnore;

import java.time.Instant;

@Entity
@Table(name = "group_members",
       uniqueConstraints = @UniqueConstraint(columnNames = {"group_id", "user_id"}))
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class GroupMember {
    @Id @UuidGenerator @Column(length = 36)
    private String id;

    @Column(name = "group_id", nullable = false)
    private String groupId;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @JsonIgnore
    @Column(length = 20) @Builder.Default
    private String role = "member";

    @Column(name = "joined_at") @Builder.Default
    private Instant joinedAt = Instant.now();
}
