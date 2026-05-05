package com.parlance.repository;

import com.parlance.model.Channel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface ChannelRepository extends JpaRepository<Channel, String> {
    Optional<Channel> findByName(String name);
    boolean existsByName(String name);
}
