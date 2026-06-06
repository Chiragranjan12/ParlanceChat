package com.parlance.config;

import com.parlance.security.JwtAuthFilter;
import com.parlance.security.JwtAuthenticationEntryPoint;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfigurationSource;

/**
 * Spring Security Configuration
 * 
 * This configuration class sets up the security filter chain with:
 * - CORS support (delegated to CorsConfig)
 * - JWT-based authentication
 * - Stateless session management
 * - CSRF protection disabled (JWT handles security)
 * - Custom JWT filter for token validation
 */
@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final JwtAuthenticationEntryPoint jwtAuthEntryPoint;
    private final CorsConfigurationSource corsConfigurationSource;

    /**
     * Configures the security filter chain
     * 
     * Features:
     * - CORS: Enabled and configured via CorsConfig
     * - CSRF: Disabled (JWT provides security instead)
     * - Sessions: Stateless (REST API with JWT)
     * - Authentication: JWT-based via JwtAuthFilter
     * - Authorization: All endpoints except health/auth require authentication
     * 
     * Flow: Request -> CORS Filter -> Security Filter -> JWT Filter -> Controller
     */
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // 1. CORS Configuration
            // Delegates to CorsConfigurationSource bean from CorsConfig
            // Handles preflight OPTIONS requests and allows configured origins
            .cors(cors -> cors.configurationSource(corsConfigurationSource))
            
            // 2. CSRF Protection
            // Disabled because we use JWT tokens instead of session cookies
            // JWT is immune to CSRF attacks since tokens are in Authorization header
            .csrf(AbstractHttpConfigurer::disable)
            
            // 3. Session Management
            // STATELESS: No server-side sessions, each request includes JWT
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            
            // 4. Exception Handling
            // Custom entry point for authentication failures
            .exceptionHandling(eh -> eh.authenticationEntryPoint(jwtAuthEntryPoint))
            
            // 5. Authorization Rules
            // Define which endpoints require authentication
            .authorizeHttpRequests(auth -> auth
                // Public endpoints - no authentication required
                .requestMatchers(
                    "/api/health",                    // Health check endpoint
                    "/api/auth/register",             // User registration
                    "/api/auth/login",                // User login
                    "/api/auth/refresh",              // Refresh JWT token
                    "/api/ws/**"                      // WebSocket connections
                ).permitAll()
                // All other endpoints require authentication
                .anyRequest().authenticated()
            )
            
            // 6. Add JWT Filter
            // Runs before UsernamePasswordAuthenticationFilter
            // Validates JWT token and sets authentication context
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
        
        return http.build();
    }

    /**
     * Password encoder bean
     * Uses BCrypt for secure password hashing
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
