# CORS Configuration - Deployment & Testing Guide

## Quick Start: Render Deployment

### 1. Update Environment Variables on Render

Navigate to your Render backend service settings and add/update these variables:

```
# CORS Configuration - Production
CORS_ORIGINS=https://parlance-chat.vercel.app

# JWT Configuration (if not already set)
JWT_SECRET=your-secure-256-bit-key-minimum-32-characters
JWT_ACCESS_EXPIRY=3600000
JWT_REFRESH_EXPIRY=604800000

# Database Configuration (verify these exist)
DB_URL=postgresql://...
DB_USERNAME=...
DB_PASSWORD=...
```

### 2. Rebuild and Deploy

```bash
# Build locally to verify
mvn clean package

# Push to Render (or trigger deployment via GitHub)
git add .
git commit -m "Fix: Update CORS configuration for production"
git push
```

### 3. Monitor Deployment

Check Render logs to verify:
- Application starts successfully
- No CORS-related errors
- JWT validation working

## Testing the Configuration

### Test 1: Health Check (No Auth Required)

```bash
curl https://parlancechat.onrender.com/api/health
```

Expected response:
```json
{"status": "UP"}
```

### Test 2: CORS Preflight Request

```bash
curl -X OPTIONS https://parlancechat.onrender.com/api/auth/login \
  -H "Origin: https://parlance-chat.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Authorization, Content-Type" \
  -v
```

Expected headers in response:
```
Access-Control-Allow-Origin: https://parlance-chat.vercel.app
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type, ...
Access-Control-Allow-Credentials: true
Access-Control-Max-Age: 3600
```

### Test 3: User Registration (Public Endpoint)

```bash
curl -X POST https://parlancechat.onrender.com/api/auth/register \
  -H "Origin: https://parlance-chat.vercel.app" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePassword123!",
    "username": "testuser"
  }'
```

Expected response (201 Created):
```json
{
  "access_token": "eyJhbGc...",
  "refresh_token": "eyJhbGc...",
  "user": {
    "id": "...",
    "email": "test@example.com",
    "username": "testuser"
  }
}
```

### Test 4: Login and Get Token

```bash
curl -X POST https://parlancechat.onrender.com/api/auth/login \
  -H "Origin: https://parlance-chat.vercel.app" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePassword123!"
  }'
```

Save the `access_token` from response for next tests.

### Test 5: Protected Endpoint (Requires Auth)

```bash
# Replace YOUR_ACCESS_TOKEN with actual token from login
curl -X GET https://parlancechat.onrender.com/api/auth/me \
  -H "Origin: https://parlance-chat.vercel.app" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Expected response (200 OK):
```json
{
  "id": "...",
  "email": "test@example.com",
  "username": "testuser",
  ...
}
```

### Test 6: Invalid Token (Should Fail)

```bash
curl -X GET https://parlancechat.onrender.com/api/auth/me \
  -H "Origin: https://parlance-chat.vercel.app" \
  -H "Authorization: Bearer invalid_token"
```

Expected response (401 Unauthorized):
```json
{
  "error": "Unauthorized",
  "message": "Invalid JWT token"
}
```

### Test 7: Missing Origin Header (Should Still Work)

```bash
curl -X GET https://parlancechat.onrender.com/api/health
```

Expected response: 200 OK (CORS not enforced for all endpoints, only for cross-origin)

## Browser-Based Testing (From Vercel Frontend)

### Test 1: Register Flow

```javascript
const response = await fetch('https://parlancechat.onrender.com/api/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  credentials: 'include',
  body: JSON.stringify({
    email: 'test@example.com',
    password: 'SecurePassword123!',
    username: 'testuser'
  })
});

const data = await response.json();
console.log('Registration response:', data);
// Save token
localStorage.setItem('accessToken', data.access_token);
```

Expected: 201 Created, token saved

### Test 2: Login Flow

```javascript
const response = await fetch('https://parlancechat.onrender.com/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  credentials: 'include',
  body: JSON.stringify({
    email: 'test@example.com',
    password: 'SecurePassword123!'
  })
});

const data = await response.json();
console.log('Login response:', data);
localStorage.setItem('accessToken', data.access_token);
```

Expected: 200 OK, token received

### Test 3: Protected Endpoint Access

```javascript
const token = localStorage.getItem('accessToken');

const response = await fetch('https://parlancechat.onrender.com/api/auth/me', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  credentials: 'include'
});

const user = await response.json();
console.log('Current user:', user);
```

Expected: 200 OK, user data returned

### Test 4: Search Users

```javascript
const token = localStorage.getItem('accessToken');

const response = await fetch('https://parlancechat.onrender.com/api/users/search?q=test', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  credentials: 'include'
});

const users = await response.json();
console.log('Search results:', users);
```

Expected: 200 OK, user list returned

### Test 5: List DMs

```javascript
const token = localStorage.getItem('accessToken');

const response = await fetch('https://parlancechat.onrender.com/api/dm/list', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  credentials: 'include'
});

const dms = await response.json();
console.log('DM list:', dms);
```

Expected: 200 OK, DM list returned

## Debugging CORS Issues

### Check Backend Logs on Render

1. Go to Render dashboard
2. Select your backend service
3. Click "Logs" tab
4. Look for CORS-related messages

### Enable Debug Logging (Optional)

Add to `application.properties`:
```properties
logging.level.org.springframework.security=DEBUG
logging.level.org.springframework.web.cors=DEBUG
```

Restart application and check logs for detailed CORS processing.

### Browser DevTools Inspection

1. Open browser DevTools (F12)
2. Go to Network tab
3. Make a request to backend
4. Check response headers:
   - `Access-Control-Allow-Origin` should match your frontend origin
   - `Access-Control-Allow-Credentials: true` should be present
   - `Access-Control-Allow-Methods` should include requested method

### Example Successful CORS Response

```
HTTP/1.1 200 OK
Access-Control-Allow-Origin: https://parlance-chat.vercel.app
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type, ...
Access-Control-Expose-Headers: Authorization, Content-Type, X-Total-Count
Access-Control-Max-Age: 3600
Content-Type: application/json
...
```

## Common Issues & Solutions

### Issue 1: "Access to XMLHttpRequest blocked by CORS"

**Check**:
1. Frontend origin exactly matches one in `app.cors.origins`
2. Include protocol (https:// or http://)
3. No trailing slash
4. Backend has been restarted after config change

**Fix**:
```bash
# Verify current config on Render
curl https://parlancechat.onrender.com/api/health -i

# Check CORS headers presence
```

### Issue 2: "401 Unauthorized" on Protected Endpoints

**Check**:
1. Token is valid (not expired, properly formatted)
2. Authorization header includes "Bearer " prefix
3. User exists in database
4. JWT secret matches in backend configuration

**Fix**:
```javascript
// Verify token format
const token = localStorage.getItem('accessToken');
console.log('Token starts with "ey":', token.startsWith('ey'));

// Test token validity
const parts = token.split('.');
console.log('Token parts count:', parts.length); // Should be 3
```

### Issue 3: "Missing Authorization Header" Warning

**Check**:
1. Authorization header correctly formatted: `Authorization: Bearer <token>`
2. No extra spaces or special characters
3. Token is not undefined/null

**Fix**:
```javascript
const token = localStorage.getItem('accessToken');
if (!token) {
  console.error('No token found - user not logged in');
  // Redirect to login
} else {
  fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
}
```

### Issue 4: "Credentials Mode is 'include' but Access-Control-Allow-Credentials is Missing"

**Fix**: Already handled in SecurityConfig, but verify:
```java
config.setAllowCredentials(true);  // Must be true
```

### Issue 5: "Preflight Request Failed"

**Fix**: OPTIONS method must be in allowed methods:
```java
config.setAllowedMethods(Arrays.asList(
    "GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"  // OPTIONS required
));
```

## Verification Checklist

- [ ] Environment variables set on Render
- [ ] Application deployed and restarted
- [ ] Health check endpoint responds (200)
- [ ] CORS preflight request succeeds (200 with proper headers)
- [ ] User registration works
- [ ] User login returns access token
- [ ] Protected endpoints accessible with valid token
- [ ] Protected endpoints reject invalid token (401)
- [ ] Search users endpoint works
- [ ] List DMs endpoint works
- [ ] No CORS errors in browser console
- [ ] No authentication errors in backend logs
- [ ] WebSocket connections established (if applicable)

## Performance Optimization

### Reduce Preflight Requests

The CORS config caches preflight responses for 1 hour:
```java
config.setMaxAge(3600L);  // 1 hour in seconds
```

This means OPTIONS requests are cached by the browser, reducing network round trips.

### Monitoring

Monitor these metrics:
1. **CORS Errors**: Should be 0 after configuration
2. **401 Responses**: Should only occur with invalid tokens
3. **Preflight Requests**: Should decrease over time (due to caching)
4. **Response Time**: Should be <100ms for cached preflight

## Next Steps

1. **Deploy Configuration**
   - Set environment variables on Render
   - Trigger deployment
   - Monitor logs

2. **Verify Endpoints**
   - Test with curl commands above
   - Test from browser console
   - Test full flow (register → login → access protected endpoints)

3. **Monitor Production**
   - Check logs regularly
   - Monitor error rates
   - Verify token refresh flow works

4. **Document for Team**
   - Share this guide with frontend team
   - Document API endpoints and authentication
   - Create runbooks for common issues

## Support

For issues or questions:
1. Check the detailed guide: [CORS_SECURITY_GUIDE.md](./CORS_SECURITY_GUIDE.md)
2. Review backend logs on Render
3. Check browser DevTools Network tab
4. Test with curl to isolate browser-specific issues
