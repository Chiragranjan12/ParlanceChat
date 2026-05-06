package com.parlance.service;

import com.parlance.model.*;
import com.parlance.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class SeedService {

    private final UserRepository userRepository;
    private final ChannelRepository channelRepository;
    private final ChannelMemberRepository channelMemberRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.email}") private String adminEmail;
    @Value("${app.admin.password}") private String adminPassword;
    @Value("${app.admin.username}") private String adminUsername;

    public void seed() {
        String adminId = seedAdmin();
        renameLegacyChannels();
        seedChannels(adminId);
        log.info("Seeding complete. Admin: {}", adminEmail);
    }

    private void renameLegacyChannels() {
        // Rename legacy "random" channel to "off-topic" so existing DBs migrate cleanly
        channelRepository.findByName("random").ifPresent(ch -> {
            if (!channelRepository.existsByName("off-topic")) {
                ch.setName("off-topic");
                ch.setDescription("Casual, off-topic conversations");
                channelRepository.save(ch);
                log.info("Migrated legacy channel 'random' -> 'off-topic'");
            }
        });
    }

    private String seedAdmin() {
        return userRepository.findByEmail(adminEmail).map(u -> {
            // Re-hash if needed
            if (!passwordEncoder.matches(adminPassword, u.getPasswordHash())) {
                u.setPasswordHash(passwordEncoder.encode(adminPassword));
                userRepository.save(u);
            }
            return u.getId();
        }).orElseGet(() -> {
            User admin = User.builder()
                    .email(adminEmail).username(adminUsername)
                    .displayName("Admin")
                    .passwordHash(passwordEncoder.encode(adminPassword))
                    .bio("Parlance Administrator").status("offline").role("admin")
                    .build();
            return userRepository.save(admin).getId();
        });
    }

    private void seedChannels(String adminId) {
        String[][] channels = {
            {"general", "General discussion for everyone", "public"},
            {"off-topic", "Casual, off-topic conversations", "public"},
            {"announcements", "Important announcements (admins only)", "broadcast"}
        };
        for (String[] ch : channels) {
            if (!channelRepository.existsByName(ch[0])) {
                Channel channel = channelRepository.save(Channel.builder()
                        .name(ch[0]).description(ch[1]).channelType(ch[2])
                        .createdBy(adminId).build());
                try {
                    channelMemberRepository.save(ChannelMember.builder()
                            .channelId(channel.getId()).userId(adminId).role("admin").build());
                } catch (Exception ignored) {}
            }
        }
    }
}
