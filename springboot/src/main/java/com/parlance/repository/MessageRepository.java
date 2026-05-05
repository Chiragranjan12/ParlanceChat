package com.parlance.repository;

import com.parlance.model.Message;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, String> {
    List<Message> findByRoomIdOrderByCreatedAtAsc(String roomId, Pageable pageable);

    @Query("SELECT m FROM Message m WHERE m.roomId = :roomId ORDER BY m.createdAt DESC")
    List<Message> findByRoomIdDesc(String roomId, Pageable pageable);

    @Query("SELECT DISTINCT m.roomId FROM Message m WHERE m.roomType = 'dm' AND (m.roomId LIKE CONCAT('dm_', :userId, '_%') OR m.roomId LIKE CONCAT('dm_%_', :userId))")
    List<String> findDmRoomIdsByUserId(String userId);

    List<Message> findByContentContainingIgnoreCaseAndIsDeletedFalseOrderByCreatedAtDesc(String content, Pageable pageable);
}
