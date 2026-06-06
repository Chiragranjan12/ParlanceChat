package com.parlance.repository;

import com.parlance.model.User;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, String> {
    Optional<User> findByEmail(String email);
    Optional<User> findByUsername(String username);
    boolean existsByEmail(String email);
    boolean existsByUsername(String username);
    List<User> findByDisplayNameContainingIgnoreCaseOrUsernameContainingIgnoreCase(String name, String username);

    @Query("""
            SELECT u FROM User u
            WHERE u.id <> :currentUserId
              AND (
                LOWER(u.username) LIKE LOWER(CONCAT('%', :query, '%'))
                OR LOWER(u.displayName) LIKE LOWER(CONCAT('%', :query, '%'))
                OR LOWER(u.email) LIKE LOWER(CONCAT('%', :query, '%'))
              )
            ORDER BY u.username ASC
            """)
    List<User> searchUsers(String query, String currentUserId, Pageable pageable);

    List<User> findByIdNotOrderByUsernameAsc(String currentUserId);
}
