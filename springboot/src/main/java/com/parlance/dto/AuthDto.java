package com.parlance.dto;

import lombok.Data;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class AuthDto {

    @Data
    public static class RegisterRequest {
        @NotBlank @Email
        private String email;
        @NotBlank @Size(min = 3, max = 30)
        private String username;
        @NotBlank @Size(min = 8)
        private String password;
        private String displayName;
    }

    @Data
    public static class LoginRequest {
        @NotBlank private String email;
        @NotBlank private String password;
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
