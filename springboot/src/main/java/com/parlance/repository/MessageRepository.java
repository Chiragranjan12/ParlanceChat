package com.parlance.repository;

import com.parlance.model.Message;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.Instant;
import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, String> {
    List<Message> findByRoomIdOrderByCreatedAtAsc(String roomId, Pageable pageable);

    @Query("SELECT m FROM Message m WHERE m.roomId = :roomId ORDER BY m.createdAt DESC")
    List<Message> findByRoomIdDesc(String roomId, Pageable pageable);

    @Query("SELECT DISTINCT m.roomId FROM Message m WHERE m.roomType = 'dm' AND (m.roomId LIKE CONCAT('dm_', :userId, '_%') OR m.roomId LIKE CONCAT('dm_%_', :userId))")
    List<String> findDmRoomIdsByUserId(String userId);

    @Query("""
            SELECT DISTINCT m FROM Message m
            JOIN User u ON u.id = m.senderId
            WHERE m.isDeleted = false
              AND m.roomType = :roomType
              AND m.roomId = :roomId
              AND (
                :query IS NULL
                OR LOWER(m.content) LIKE LOWER(CONCAT('%', :query, '%'))
                OR LOWER(u.username) LIKE LOWER(CONCAT('%', :query, '%'))
                OR LOWER(u.displayName) LIKE LOWER(CONCAT('%', :query, '%'))
              )
              AND (:sender IS NULL OR LOWER(u.username) = LOWER(:sender) OR u.id = :sender)
              AND (:fromDate IS NULL OR m.createdAt >= :fromDate)
              AND (:toDate IS NULL OR m.createdAt <= :toDate)
            ORDER BY m.createdAt DESC
            """)
    List<Message> searchRoomMessages(@Param("roomType") String roomType,
                                     @Param("roomId") String roomId,
                                     @Param("query") String query,
                                     @Param("sender") String sender,
                                     @Param("fromDate") Instant fromDate,
                                     @Param("toDate") Instant toDate,
                                     Pageable pageable);
}
