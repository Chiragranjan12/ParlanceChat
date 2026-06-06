package com.parlance.config;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

/**
 * Global CORS Configuration for Spring Boot + Spring Security
 * 
 * This configuration enables CORS for all endpoints and allows requests from
 * configured origins with proper handling of preflight OPTIONS requests.
 * 
 * Key Features:
 * - Supports multiple origins (dev, staging, production)
 * - Allows credentials (JWT in Authorization header)
 * - Handles preflight OPTIONS requests
 * - Allows common HTTP methods (GET, POST, PUT, DELETE, PATCH, OPTIONS)
 * - Exposes Authorization header to frontend
 * - Properly integrated with Spring Security filter chain
 */
@Configuration
@RequiredArgsConstructor
public class CorsConfig {

    @Value("${app.cors.origins}")
    private String corsOrigins;

    /**
     * Configures CORS settings for the application
     * 
     * @return CorsConfigurationSource bean used by Spring Security
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        
        // Parse and set allowed origins from application properties
        // Format: origin1,origin2,origin3
        List<String> allowedOrigins = Arrays.stream(corsOrigins.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
        
        config.setAllowedOrigins(allowedOrigins);
        
        // Allow all HTTP methods required by the frontend
        config.setAllowedMethods(Arrays.asList(
                "GET",      // Retrieve data
                "POST",     // Submit data (auth, create resources)
                "PUT",      // Update entire resource
                "DELETE",   // Delete resource
                "PATCH",    // Partial update
                "OPTIONS"   // Preflight requests
        ));
        
        // Allow all headers required by frontend
        // This includes Authorization header for JWT tokens
        config.setAllowedHeaders(Arrays.asList("*"));
        
        // Expose headers that frontend needs to read
        // Authorization header is needed if frontend reads tokens from response headers
        config.setExposedHeaders(Arrays.asList(
                "Authorization",
                "Content-Type",
                "X-Total-Count"  // Useful for pagination
        ));
        
        // Enable credentials (JWT tokens in Authorization header)
        // IMPORTANT: This must be true for Authorization header to work with credentials
        config.setAllowCredentials(true);
        
        // Cache preflight response for 1 hour to reduce preflight requests
        config.setMaxAge(3600L);
        
        // Register CORS configuration for all paths
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        
        return source;
    }
}
