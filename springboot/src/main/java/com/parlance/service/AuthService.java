package com.parlance.service;

import com.parlance.dto.*;
import com.parlance.model.*;
import com.parlance.repository.*;
import com.parlance.security.JwtUtil;
import com.parlance.websocket.ChatWebSocketHandler;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final ChannelRepository channelRepository;
    private final ChannelMemberRepository channelMemberRepository;
    private final LoginAttemptRepository loginAttemptRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final ChatWebSocketHandler wsHandler;

    @Transactional
    public AuthDto.AuthResponse register(AuthDto.RegisterRequest req, HttpServletResponse response) {
        String email = req.getEmail().toLowerCase().trim();
        String username = req.getUsername().toLowerCase().trim();

        if (userRepository.existsByEmail(email))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
        if (userRepository.existsByUsername(username))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Username already taken");

        User user = userRepository.save(User.builder()
                .email(email).username(username)
                .displayName(req.getDisplayName() != null ? req.getDisplayName() : username)
                .passwordHash(passwordEncoder.encode(req.getPassword()))
                .status("online").role("user").build());

        // Auto-join general + random
        for (String chName : new String[]{"general", "random"}) {
            channelRepository.findByName(chName).ifPresent(ch -> {
                if (!channelMemberRepository.existsByChannelIdAndUserId(ch.getId(), user.getId())) {
                    channelMemberRepository.save(ChannelMember.builder()
                            .channelId(ch.getId()).userId(user.getId()).role("member").build());
                }
            });
        }

        String accessToken = jwtUtil.generateAccessToken(user.getId(), email);
        String refreshToken = jwtUtil.generateRefreshToken(user.getId());
        setTokenCookies(response, accessToken, refreshToken);

        return new AuthDto.AuthResponse(UserDto.from(user), accessToken);
    }

    @Transactional
    public AuthDto.AuthResponse login(AuthDto.LoginRequest req, HttpServletResponse response, String clientIp) {
        String email = req.getEmail().toLowerCase().trim();
        String identifier = clientIp + ":" + email;

        loginAttemptRepository.findByIdentifier(identifier).ifPresent(att -> {
            if (att.getCount() >= 5 && att.getLastAttempt() != null) {
                long secondsSince = Instant.now().getEpochSecond() - att.getLastAttempt().getEpochSecond();
                if (secondsSince < 900)
                    throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                            "Too many failed attempts. Try again in 15 minutes.");
            }
        });

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> {
                    recordFailedAttempt(identifier);
                    return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
                });

        if (!passwordEncoder.matches(req.getPassword(), user.getPasswordHash())) {
            recordFailedAttempt(identifier);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }

        loginAttemptRepository.findByIdentifier(identifier).ifPresent(loginAttemptRepository::delete);

        user.setStatus("online");
        user.setLastSeen(Instant.now());
        userRepository.save(user);

        String accessToken = jwtUtil.generateAccessToken(user.getId(), email);
        String refreshToken = jwtUtil.generateRefreshToken(user.getId());
        setTokenCookies(response, accessToken, refreshToken);

        return new AuthDto.AuthResponse(UserDto.from(user), accessToken);
    }

    @Transactional
    public void logout(User user, HttpServletResponse response) {
        user.setStatus("offline");
        user.setLastSeen(Instant.now());
        userRepository.save(user);
        clearTokenCookies(response);
    }

    public String refresh(String refreshToken, HttpServletResponse response) {
        if (refreshToken == null || !jwtUtil.validateToken(refreshToken))
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid refresh token");
        if (!"refresh".equals(jwtUtil.getTokenType(refreshToken)))
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid token type");

        String userId = jwtUtil.getUserId(refreshToken);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));

        String newAccessToken = jwtUtil.generateAccessToken(user.getId(), user.getEmail());
        Cookie cookie = new Cookie("access_token", newAccessToken);
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge(86400);
        response.addCookie(cookie);
        return newAccessToken;
    }

    private void recordFailedAttempt(String identifier) {
        LoginAttempt att = loginAttemptRepository.findByIdentifier(identifier)
                .orElse(LoginAttempt.builder().identifier(identifier).count(0).build());
        att.setCount(att.getCount() + 1);
        att.setLastAttempt(Instant.now());
        loginAttemptRepository.save(att);
    }

    private void setTokenCookies(HttpServletResponse response, String accessToken, String refreshToken) {
        Cookie ac = new Cookie("access_token", accessToken);
        ac.setHttpOnly(true); ac.setPath("/"); ac.setMaxAge(86400);
        Cookie rc = new Cookie("refresh_token", refreshToken);
        rc.setHttpOnly(true); rc.setPath("/"); rc.setMaxAge(604800);
        response.addCookie(ac);
        response.addCookie(rc);
    }

    private void clearTokenCookies(HttpServletResponse response) {
        Cookie ac = new Cookie("access_token", ""); ac.setMaxAge(0); ac.setPath("/");
        Cookie rc = new Cookie("refresh_token", ""); rc.setMaxAge(0); rc.setPath("/");
        response.addCookie(ac);
        response.addCookie(rc);
    }
}
