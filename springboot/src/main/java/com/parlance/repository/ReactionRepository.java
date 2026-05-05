package com.parlance.repository;

import com.parlance.model.Reaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ReactionRepository extends JpaRepository<Reaction, String> {
    List<Reaction> findByMessageId(String messageId);
    Optional<Reaction> findByMessageIdAndUserIdAndEmoji(String messageId, String userId, String emoji);
    void deleteByMessageIdAndUserIdAndEmoji(String messageId, String userId, String emoji);
}
