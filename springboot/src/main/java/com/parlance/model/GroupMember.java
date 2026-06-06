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

    @Enumerated(EnumType.STRING)
    @Column(length = 20) @Builder.Default
    private GroupRole role = GroupRole.MEMBER;

    @Column(name = "joined_at") @Builder.Default
    private Instant joinedAt = Instant.now();

    @Column(name = "is_active") @Builder.Default
    private Boolean isActive = true;

    public enum GroupRole {
        ADMIN,
        MEMBER
    }
}
