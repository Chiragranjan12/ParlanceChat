package com.parlance.repository;

import com.parlance.model.LoginAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface LoginAttemptRepository extends JpaRepository<LoginAttempt, String> {
    Optional<LoginAttempt> findByIdentifier(String identifier);
    void deleteByIdentifier(String identifier);
}
