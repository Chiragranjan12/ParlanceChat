package com.parlance.dto;

import lombok.Data;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class AuthDto {

    @Data
    public static class RegisterRequest {
        @NotBlank(message = "Email is required")
        @Email(message = "Email must be a valid email address")
        private String email;

        @NotBlank(message = "Username is required")
        @Size(min = 3, max = 30, message = "Username must be between 3 and 30 characters")
        @Pattern(regexp = "^[a-zA-Z0-9_-]+$", message = "Username can only contain letters, numbers, underscore, and hyphen")
        private String username;

        @NotBlank(message = "Password is required")
        @Size(min = 8, max = 128, message = "Password must be between 8 and 128 characters")
        private String password;

        @Size(max = 255, message = "Display name must not exceed 255 characters")
        private String displayName;
    }

    @Data
    public static class LoginRequest {
        @NotBlank(message = "Email is required")
        @Email(message = "Email must be a valid email address")
        private String email;

        @NotBlank(message = "Password is required")
        @Size(min = 8, max = 128, message = "Password must be between 8 and 128 characters")
        private String password;
    }

    @Data
    public static class AuthResponse {
        private UserDto user;
        private String accessToken;
        public AuthResponse(UserDto user, String token) {
            this.user = user;
            this.accessToken = token;
        }
    }
}
