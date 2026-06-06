# Complete Production-Ready Code

This file contains the complete production-ready code for CORS configuration. You can use this as a reference or to verify your implementation.

## 1. CorsConfig.java (NEW FILE)

**Location**: `springboot/src/main/java/com/parlance/config/CorsConfig.java`

```java
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
```

## 2. SecurityConfig.java (UPDATED)

**Location**: `springboot/src/main/java/com/parlance/config/SecurityConfig.java`

```java
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
```

## 3. application.properties (UPDATED - CORS Section)

**Location**: `springboot/src/main/resources/application.properties`

**Original CORS Configuration**:
```properties
app.cors.origins=${CORS_ORIGINS:https://parlance-dev.preview.emergentagent.com,http://localhost:3000,http://localhost:8001,https://*.preview.emergentagent.com,https://*.preview.emergentcf.cloud,https://*.emergentcf.cloud,https://*.emergentagent.com}
```

**Updated CORS Configuration**:
```properties
# ============================================
# CORS Configuration
# ============================================
# Format: comma-separated list of allowed origins
# For production: use explicit origins without wildcards
# IMPORTANT: Do NOT use http://localhost:* in production
app.cors.origins=https://parlance-chat.vercel.app,http://localhost:3000,http://localhost:5173
```

**For Production on Render** (set as environment variable):
```properties
app.cors.origins=${CORS_ORIGINS:http://localhost:3000}
```

Then in Render dashboard environment variables:
```
CORS_ORIGINS=https://parlance-chat.vercel.app
```

## Configuration Comparison

### Before (Not Working)
```java
// In SecurityConfig.java - WRONG APPROACH
@Bean
public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration config = new CorsConfiguration();
    List<String> origins = Arrays.stream(corsOrigins.split(","))
            .map(String::trim)
            .filter(s -> !s.isEmpty())
            .toList();
    config.setAllowedOriginPatterns(origins);  // ❌ PROBLEM: Doesn't work with credentials
    config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
    config.setAllowedHeaders(List.of("*"));
    config.setExposedHeaders(List.of("Authorization", "Content-Type"));
    config.setAllowCredentials(true);          // ❌ CONFLICT: Can't use with wildcard patterns
    config.setMaxAge(3600L);
    // ... rest of config
}
```

### After (Production-Ready)
```java
// In CorsConfig.java - CORRECT APPROACH
@Bean
public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration config = new CorsConfiguration();
    List<String> allowedOrigins = Arrays.stream(corsOrigins.split(","))
            .map(String::trim)
            .filter(s -> !s.isEmpty())
            .toList();
    config.setAllowedOrigins(allowedOrigins);   // ✅ Explicit origins (no patterns)
    config.setAllowedMethods(Arrays.asList(
            "GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"
    ));
    config.setAllowedHeaders(Arrays.asList("*"));
    config.setExposedHeaders(Arrays.asList(
            "Authorization", "Content-Type", "X-Total-Count"
    ));
    config.setAllowCredentials(true);           // ✅ Works with explicit origins
    config.setMaxAge(3600L);
    // ... rest of config
}
```

## How to Apply Changes

### Step 1: Create CorsConfig.java
Copy the CorsConfig.java code above and create the file at:
```
springboot/src/main/java/com/parlance/config/CorsConfig.java
```

### Step 2: Update SecurityConfig.java
Replace the entire SecurityConfig.java file with the code above at:
```
springboot/src/main/java/com/parlance/config/SecurityConfig.java
```

### Step 3: Update application.properties
Update the CORS section in:
```
springboot/src/main/resources/application.properties
```

With:
```properties
# ============================================
# CORS Configuration
# ============================================
# Format: comma-separated list of allowed origins
# For production: use explicit origins without wildcards
# IMPORTANT: Do NOT use http://localhost:* in production
app.cors.origins=https://parlance-chat.vercel.app,http://localhost:3000,http://localhost:5173
```

### Step 4: Build and Test
```bash
# Clean and build
mvn clean package

# Test locally
mvn spring-boot:run

# Test endpoints
curl http://localhost:8080/api/health
curl http://localhost:8080/api/auth/login -d {...}
```

### Step 5: Deploy to Render
```bash
# Commit changes
git add springboot/
git commit -m "Fix: Update CORS configuration for production"
git push

# Render auto-deploys, or manually trigger
# Set environment variable: CORS_ORIGINS=https://parlance-chat.vercel.app
```

## Verification Commands

### Test Health Endpoint (No Auth Required)
```bash
curl https://parlancechat.onrender.com/api/health -v
```

### Test CORS Preflight
```bash
curl -X OPTIONS https://parlancechat.onrender.com/api/auth/login \
  -H "Origin: https://parlance-chat.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Authorization, Content-Type" \
  -v
```

### Test Login
```bash
curl -X POST https://parlancechat.onrender.com/api/auth/login \
  -H "Origin: https://parlance-chat.vercel.app" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

### Test Protected Endpoint
```bash
# Replace YOUR_TOKEN with actual JWT from login response
curl -X GET https://parlancechat.onrender.com/api/auth/me \
  -H "Origin: https://parlance-chat.vercel.app" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -v
```

## Rollback Instructions

If you need to revert to the old configuration:

### Option 1: Remove CorsConfig, Keep Old SecurityConfig
1. Delete `springboot/src/main/java/com/parlance/config/CorsConfig.java`
2. Revert SecurityConfig.java to use inline CORS configuration
3. Update application.properties with old CORS origins

### Option 2: Git Revert
```bash
# Find the commit before this change
git log --oneline

# Revert to previous commit
git revert <commit-hash>
git push
```

## Production Checklist

Before deploying to production:

- [ ] All three files created/updated correctly
- [ ] Build succeeds: `mvn clean package`
- [ ] No compilation errors
- [ ] Local testing passes
- [ ] CORS_ORIGINS environment variable set on Render
- [ ] Backend restarted on Render
- [ ] Endpoints tested from Vercel frontend
- [ ] No CORS errors in browser console
- [ ] JWT tokens working correctly
- [ ] Preflight requests succeeding
- [ ] Public endpoints accessible without auth
- [ ] Protected endpoints requiring JWT token

## Support

For issues or questions, refer to:
1. [CORS_IMPLEMENTATION_SUMMARY.md](./CORS_IMPLEMENTATION_SUMMARY.md) - Quick reference
2. [CORS_SECURITY_GUIDE.md](./CORS_SECURITY_GUIDE.md) - Detailed guide
3. [CORS_DEPLOYMENT_TESTING.md](./CORS_DEPLOYMENT_TESTING.md) - Testing procedures
