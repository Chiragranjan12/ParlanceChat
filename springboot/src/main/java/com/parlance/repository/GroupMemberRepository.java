package com.parlance.repository;

import com.parlance.model.GroupMember;
import com.parlance.model.GroupMember.GroupRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface GroupMemberRepository extends JpaRepository<GroupMember, String> {
    @Query("SELECT gm FROM GroupMember gm WHERE gm.userId = :userId AND gm.isActive = true")
    List<GroupMember> findByUserId(String userId);
    
    @Query("SELECT gm FROM GroupMember gm WHERE gm.groupId = :groupId AND gm.isActive = true")
    List<GroupMember> findByGroupId(String groupId);
    
    @Query("SELECT gm FROM GroupMember gm WHERE gm.groupId = :groupId AND gm.userId = :userId AND gm.isActive = true")
    Optional<GroupMember> findByGroupIdAndUserId(String groupId, String userId);
    
    @Query("SELECT CASE WHEN COUNT(gm) > 0 THEN true ELSE false END " +
           "FROM GroupMember gm WHERE gm.groupId = :groupId AND gm.userId = :userId AND gm.isActive = true")
    boolean existsByGroupIdAndUserId(String groupId, String userId);
    
    @Query("SELECT CASE WHEN COUNT(gm) > 0 THEN true ELSE false END " +
           "FROM GroupMember gm WHERE gm.groupId = :groupId AND gm.userId = :userId AND gm.role = :role AND gm.isActive = true")
    boolean isAdmin(String groupId, String userId, GroupRole role);
    
    @Query("SELECT COUNT(gm) FROM GroupMember gm WHERE gm.groupId = :groupId AND gm.isActive = true")
    long countByGroupId(String groupId);
}
