package com.parlance.repository;

import com.parlance.model.GroupMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface GroupMemberRepository extends JpaRepository<GroupMember, String> {
    List<GroupMember> findByUserId(String userId);
    List<GroupMember> findByGroupId(String groupId);
    Optional<GroupMember> findByGroupIdAndUserId(String groupId, String userId);
    boolean existsByGroupIdAndUserId(String groupId, String userId);
    long countByGroupId(String groupId);
}
