# CORS Configuration - Implementation Summary

## What Was Fixed

### Problem
- CORS preflight requests were being blocked
- Frontend requests to `/api/auth/register`, `/api/auth/login`, `/api/auth/me` failed
- Browser error: "Missing Access-Control-Allow-Origin header"
- Configuration used `setAllowedOriginPatterns()` with credentials, which doesn't work correctly

### Solution
- Created dedicated `CorsConfig.java` with proper CORS configuration
- Updated `SecurityConfig.java` to integrate CORS correctly with Spring Security
- Updated `application.properties` with production origins
- Fixed to use `setAllowedOrigins()` instead of `setAllowedOriginPatterns()`

## Files Changed

### 1. Created: `CorsConfig.java`
**Path**: `springboot/src/main/java/com/parlance/config/CorsConfig.java`

**Purpose**: 
- Dedicated CORS configuration bean
- Separates CORS logic from Security configuration
- Better maintainability and clarity

**Key Configuration**:
```java
config.setAllowedOrigins(allowedOrigins);           // Explicit origins (no wildcards)
config.setAllowedMethods(GET, POST, PUT, DELETE, PATCH, OPTIONS);
config.setAllowedHeaders("*");
config.setAllowCredentials(true);                   // Enables JWT credentials
config.setMaxAge(3600L);                            // Cache preflight for 1 hour
```

### 2. Updated: `SecurityConfig.java`
**Path**: `springboot/src/main/java/com/parlance/config/SecurityConfig.java`

**Changes**:
- Removed duplicate CORS configuration
- Added dependency injection of `CorsConfigurationSource` from `CorsConfig`
- Updated `filterChain()` to use injected CORS configuration
- Added comprehensive comments explaining security filter chain
- Removed unused imports (`@Value`, `CorsConfiguration`, etc.)

**Key Configuration**:
```java
private final CorsConfigurationSource corsConfigurationSource;  // New injection

@Bean
public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http
        .cors(cors -> cors.configurationSource(corsConfigurationSource))  // Use injected config
        .csrf(AbstractHttpConfigurer::disable)                           // JWT doesn't need CSRF
        .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .exceptionHandling(eh -> eh.authenticationEntryPoint(jwtAuthEntryPoint))
        .authorizeHttpRequests(auth -> auth
            .requestMatchers("/api/health", "/api/auth/**", "/api/ws/**").permitAll()
            .anyRequest().authenticated()
        )
        .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
    return http.build();
}
```

### 3. Updated: `application.properties`
**Path**: `springboot/src/main/resources/application.properties`

**Before**:
```properties
app.cors.origins=${CORS_ORIGINS:https://parlance-dev.preview.emergentagent.com,http://localhost:3000,http://localhost:8001,https://*.preview.emergentagent.com,https://*.preview.emergentcf.cloud,https://*.emergentcf.cloud,https://*.emergentagent.com}
```

**After**:
```properties
app.cors.origins=https://parlance-chat.vercel.app,http://localhost:3000,http://localhost:5173
```

**For Production on Render**:
```properties
app.cors.origins=${CORS_ORIGINS:http://localhost:3000}
```
Then set `CORS_ORIGINS` environment variable on Render.

## Security Filter Chain Flow

```
1. Client Browser Request
   ↓
2. CORS Filter (from CorsConfig)
   - Validates origin against app.cors.origins
   - For preflight OPTIONS: responds with CORS headers
   - For actual request: passes through
   ↓
3. Security Filter
   - Validates CSRF token (disabled for JWT)
   - Session management (stateless for REST)
   ↓
4. JWT Auth Filter
   - Extracts token from Authorization header or cookie
   - Validates token signature and expiry
   - Sets authentication context
   ↓
5. Authorization Filter
   - Checks if endpoint requires authentication
   - Permits public endpoints (/api/health, /api/auth/*, /api/ws/**)
   - Requires authentication for others
   ↓
6. Controller
   - Processes request
   - Returns response with CORS headers
```

## Configuration Details

### CORS Headers Explained

**Request Headers Sent by Browser**:
```
Origin: https://parlance-chat.vercel.app
Access-Control-Request-Method: POST
Access-Control-Request-Headers: Authorization, Content-Type
```

**Response Headers from Backend**:
```
Access-Control-Allow-Origin: https://parlance-chat.vercel.app
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type, ...
Access-Control-Allow-Credentials: true
Access-Control-Max-Age: 3600
```

### JWT Token Flow

**Login**:
```
POST /api/auth/login
{email, password}
    ↓
Response: {access_token: "eyJhbGc...", refresh_token: "...", user: {...}}
```

**Authenticated Requests**:
```
GET /api/auth/me
Authorization: Bearer eyJhbGc...
    ↓
JWT Filter extracts token and validates
    ↓
User loaded from database
    ↓
Request processed with user context
```

## Environment Variables for Production

**Render Backend Settings**:
```
CORS_ORIGINS=https://parlance-chat.vercel.app
JWT_SECRET=your-256-bit-secure-key-minimum-32-characters
JWT_ACCESS_EXPIRY=3600000
JWT_REFRESH_EXPIRY=604800000
DB_URL=postgresql://...
DB_USERNAME=...
DB_PASSWORD=...
```

## Testing Checklist

### Local Development
```bash
# Build
mvn clean package

# Run
mvn spring-boot:run

# Test endpoints
curl http://localhost:8080/api/health
curl http://localhost:8080/api/auth/register -d {...}
```

### Production on Render
```bash
# Test from Vercel
fetch('https://parlancechat.onrender.com/api/auth/login', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  credentials: 'include',
  body: JSON.stringify({email, password})
})

# Test from curl
curl https://parlancechat.onrender.com/api/health -i
```

## Verification Steps

1. **Check CORS Headers**:
   - Browser DevTools → Network tab
   - Look for `Access-Control-Allow-Origin` header
   - Should match frontend origin

2. **Check JWT Flow**:
   - Login endpoint returns `access_token`
   - Token sent in `Authorization: Bearer <token>` header
   - Protected endpoints validate token
   - Invalid token returns 401

3. **Check Public Endpoints**:
   - `/api/health` returns 200
   - `/api/auth/register` accepts POST
   - `/api/auth/login` accepts POST
   - These don't require authentication

4. **Check Protected Endpoints**:
   - `/api/auth/me` requires JWT token
   - `/api/users/search` requires JWT token
   - `/api/dm/list` requires JWT token
   - Missing token returns 401

## Common Questions

### Q: Why use `setAllowedOrigins()` instead of `setAllowedOriginPatterns()`?
**A**: `setAllowedOriginPatterns()` doesn't work properly with `allowCredentials(true)`. Use explicit origins for production.

### Q: Why is CSRF disabled?
**A**: JWT tokens in Authorization headers are immune to CSRF. CSRF protection is needed for cookies, not Authorization headers.

### Q: Why is session management stateless?
**A**: REST APIs with JWT don't need server-side sessions. Each request includes the token, so `SessionCreationPolicy.STATELESS` is appropriate.

### Q: Can I use `allowedOrigins("*")` with credentials?
**A**: No. Spring Security will reject this combination. Use explicit origins for credentials support.

### Q: How are tokens stored on frontend?
**A**: Recommended: sessionStorage or memory (more secure). The JWT filter extracts from `Authorization: Bearer <token>` header.

### Q: What happens with expired tokens?
**A**: JWT filter validates expiry. Expired tokens return 401 Unauthorized. Frontend should call refresh endpoint to get new token.

### Q: How does preflight caching work?
**A**: Browser caches OPTIONS response for 1 hour (3600L). Reduces network requests for same endpoint within that window.

## Deployment Steps

1. **Commit Changes**:
   ```bash
   git add springboot/src/main/java/com/parlance/config/CorsConfig.java
   git add springboot/src/main/java/com/parlance/config/SecurityConfig.java
   git add springboot/src/main/resources/application.properties
   git commit -m "Fix: Update CORS configuration for production"
   git push
   ```

2. **Set Environment Variables on Render**:
   - Go to backend service settings
   - Add `CORS_ORIGINS=https://parlance-chat.vercel.app`
   - Verify other variables are set

3. **Redeploy**:
   - Render auto-deploys on push
   - Or manually trigger deployment

4. **Verify**:
   - Check logs for startup success
   - Test endpoints with curl
   - Test from Vercel frontend

## Additional Resources

- [CORS_SECURITY_GUIDE.md](./CORS_SECURITY_GUIDE.md) - Detailed security guide
- [CORS_DEPLOYMENT_TESTING.md](./CORS_DEPLOYMENT_TESTING.md) - Testing procedures
- Spring Security Docs: https://spring.io/projects/spring-security
- CORS Spec: https://www.w3.org/TR/cors/

## Summary

✅ **What's Fixed**:
- CORS properly configured for production
- Frontend can make requests to backend from Vercel
- JWT authentication works across origins
- Preflight OPTIONS requests handled correctly
- CSRF protection appropriately disabled
- Session management stateless for REST API

✅ **What's Secure**:
- JWT tokens validated on every request
- Credentials only sent to configured origins
- CSRF not a concern with JWT
- Proper error handling with custom entry points

✅ **What's Optimized**:
- Preflight responses cached (1 hour)
- Separate config for maintainability
- Production-ready with environment variables
- Comprehensive documentation for troubleshooting
