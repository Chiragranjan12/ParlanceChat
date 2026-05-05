package com.parlance.repository;

import com.parlance.model.ChannelMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ChannelMemberRepository extends JpaRepository<ChannelMember, String> {
    List<ChannelMember> findByUserId(String userId);
    List<ChannelMember> findByChannelId(String channelId);
    Optional<ChannelMember> findByChannelIdAndUserId(String channelId, String userId);
    boolean existsByChannelIdAndUserId(String channelId, String userId);
    void deleteByChannelIdAndUserId(String channelId, String userId);
    long countByChannelId(String channelId);
}
