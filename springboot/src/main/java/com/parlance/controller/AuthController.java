package com.parlance.controller;

import com.parlance.dto.AuthDto;
import com.parlance.model.User;
import com.parlance.service.AuthService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Arrays;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthDto.AuthResponse register(@Valid @RequestBody AuthDto.RegisterRequest req,
                                         HttpServletResponse response) {
        return authService.register(req, response);
    }

    @PostMapping("/login")
    public AuthDto.AuthResponse login(@Valid @RequestBody AuthDto.LoginRequest req,
                                      HttpServletResponse response,
                                      HttpServletRequest request) {
        String ip = request.getRemoteAddr();
        return authService.login(req, response, ip);
    }

    @PostMapping("/logout")
    public Map<String, String> logout(@AuthenticationPrincipal User user, HttpServletResponse response) {
        if (user == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        authService.logout(user, response);
        return Map.of("message", "Logged out");
    }

    @GetMapping("/me")
    public User me(@AuthenticationPrincipal User user) {
        if (user == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        return user;
    }

    @PostMapping("/refresh")
    public Map<String, String> refresh(HttpServletRequest request, HttpServletResponse response) {
        String refreshToken = null;
        if (request.getCookies() != null) {
            refreshToken = Arrays.stream(request.getCookies())
                    .filter(c -> "refresh_token".equals(c.getName()))
                    .map(Cookie::getValue).findFirst().orElse(null);
        }
        String newToken = authService.refresh(refreshToken, response);
        return Map.of("access_token", newToken);
    }
}
