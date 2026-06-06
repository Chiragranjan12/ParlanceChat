package com.parlance.repository;

import com.parlance.model.Group;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface GroupRepository extends JpaRepository<Group, String> {
    @Query("SELECT g FROM Group g WHERE g.id = :id AND g.isActive = true")
    Optional<Group> findByIdActive(String id);
    
    @Query("SELECT g FROM Group g WHERE g.isActive = true")
    List<Group> findAllActive();
    
    @Query("SELECT g FROM Group g WHERE g.createdBy = :userId AND g.isActive = true")
    List<Group> findByCreatedBy(String userId);
}
