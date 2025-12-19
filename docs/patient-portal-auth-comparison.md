# Patient Portal Authentication: Old vs New System Comparison

## Overview

This document compares the **old CRM-based authentication system** with the **new OAuth2-like authorization code flow** for accessing the Patient Portal from the Store Frontend.

---

## 🔴 Old Authentication System

### Architecture Flow

```
┌─────────────────┐
│ Store Frontend  │ (User logged in)
│  (Next.js App)  │
└────────┬────────┘
         │
         │ 1. User clicks "My Account"
         │    GET /api/my-account-url
         │
         ▼
┌─────────────────┐
│  Next.js API    │
│  Route Handler  │
└────────┬────────┘
         │
         │ 2. Authenticate with CRM API
         │    POST {CRM_HOST}/api/login
         │    Body: { email, password }
         │    (Uses CRM_API_USERNAME & CRM_API_PASSWORD from env)
         │
         ▼
┌─────────────────┐
│   CRM System    │
│   (External)    │
└────────┬────────┘
         │
         │ 3. Returns CRM token
         │
         ▼
┌─────────────────┐
│  Next.js API    │
│  Route Handler  │
└────────┬────────┘
         │
         │ 4. Request auto-login link
         │    GET {PORTAL_HOST}/api/user/auto-login-link
         │    Query: wp_user_id, expiration_hour, redirect
         │    Header: Authorization: Bearer {CRM_TOKEN}
         │
         ▼
┌─────────────────┐
│ Patient Portal  │
│   (External)    │
└────────┬────────┘
         │
         │ 5. Returns direct auto-login URL
         │    (Contains pre-authenticated session token)
         │
         ▼
┌─────────────────┐
│ Store Frontend  │
│  (Next.js App)  │
└────────┬────────┘
         │
         │ 6. Redirects user to portal URL
         │    User is already logged in
         │
         ▼
┌─────────────────┐
│ Patient Portal  │
│  (User logged in automatically)
└─────────────────┘
```

### Implementation Details

**API Route**: `/app/api/my-account-url/route.js`

**Key Components:**

1. **CRM Authentication**

   - Uses service account credentials stored in environment variables
   - `CRM_API_USERNAME` - Service account email
   - `CRM_API_PASSWORD` - Base64 encoded password
   - Authenticates with CRM to get a temporary token

2. **Portal Auto-Login Link**

   - Uses CRM token to request an auto-login link from Portal API
   - Link contains a pre-authenticated session token
   - Link expires after specified hours (default: 1 hour)
   - Includes redirect page parameter

3. **Direct URL Return**
   - Returns the auto-login URL directly to frontend
   - Frontend redirects user to this URL
   - User is automatically logged in on the portal

**Environment Variables Required:**

```env
CRM_HOST=https://crm.example.com
PORTAL_HOST=https://portal.example.com
CRM_API_USERNAME=service@example.com
CRM_API_PASSWORD=base64_encoded_password
```

**Code Flow:**

```javascript
// 1. Authenticate with CRM
const loginResponse = await fetch(`${crmHostUrl}/api/login`, {
  method: "POST",
  body: JSON.stringify({
    email: apiUsername,
    password: apiPassword, // Decoded from base64
  }),
});

const { token } = await loginResponse.json();

// 2. Get auto-login link
const portalResponse = await fetch(
  `${portalHostUrl}/api/user/auto-login-link?wp_user_id=${userId}&expiration_hour=1&redirect=${redirectPage}`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);

const { link } = await portalResponse.json();

// 3. Return URL to frontend
return NextResponse.json({ success: true, url: link });
```

### Security Characteristics

#### ✅ Advantages

- Simple implementation
- Direct authentication path
- No intermediate steps for user

#### ❌ Security Concerns

1. **Service Account Credentials in Environment**

   - CRM API credentials stored in environment variables
   - If compromised, attacker has full CRM access
   - Credentials must be rotated manually

2. **Long-Lived Auto-Login Links**

   - Auto-login links valid for extended periods (1+ hours)
   - If link is intercepted, attacker can access portal
   - No single-use enforcement
   - Links can be reused multiple times

3. **No CSRF Protection**

   - No state parameter validation
   - Vulnerable to cross-site request forgery attacks

4. **Token Exposure Risk**

   - CRM token passed to Portal API
   - If Portal API is compromised, CRM token is exposed
   - No token scope limitations

5. **Direct Session Token in URL**

   - Auto-login links contain session tokens
   - Tokens visible in browser history, logs, referrer headers
   - Risk of token leakage through various channels

6. **No Audit Trail**

   - Difficult to track authorization events
   - No way to revoke individual authorizations

7. **Tight Coupling**
   - Frontend depends on CRM and Portal APIs
   - Changes in CRM/Portal require frontend updates
   - No abstraction layer

---

## 🟢 New Authentication System

### Architecture Flow

```
┌─────────────────┐
│ Store Frontend  │ (User logged in with JWT)
│  (Next.js App)  │
└────────┬────────┘
         │
         │ 1. User clicks "My Account"
         │    GET /api/my-account-url
         │
         ▼
┌─────────────────┐
│  Next.js API    │
│  Route Handler  │
└────────┬────────┘
         │
         │ 2. Get JWT from cookies
         │    Extract authToken cookie
         │
         │ 3. Request authorization
         │    GET {BACKEND_URL}/api/v1/auth/authorize
         │    Query: app=patient-portal&redirect_uri=...&state=...
         │    Header: Authorization: Bearer {JWT_TOKEN}
         │
         ▼
┌─────────────────┐
│  Backend API    │
│   (NestJS)      │
└────────┬────────┘
         │
         │ 4. Validate JWT token
         │    Extract user information
         │    Generate authorization code
         │    Store code with expiration (short-lived)
         │
         │ 5. Redirect to Patient Portal
         │    HTTP 302 to {PORTAL_URL}/auth/callback?code=...&state=...
         │
         ▼
┌─────────────────┐
│ Patient Portal  │
│  (Next.js App)  │
└────────┬────────┘
         │
         │ 6. Receive authorization code
         │    Extract code and state from URL
         │
         │ 7. Exchange code for tokens
         │    POST {BACKEND_URL}/api/v1/auth/exchange-code
         │    Body: { code, app: "patient-portal", state }
         │
         ▼
┌─────────────────┐
│  Backend API    │
│   (NestJS)      │
└────────┬────────┘
         │
         │ 8. Validate authorization code
         │    Check expiration, single-use, app match
         │    Validate state parameter (CSRF protection)
         │    Return JWT tokens (access + refresh)
         │
         ▼
┌─────────────────┐
│ Patient Portal  │
│  (Next.js App)  │
└────────┬────────┘
         │
         │ 9. Store tokens in localStorage/cookies
         │    Redirect to dashboard
         │
         ▼
┌─────────────────┐
│ Patient Portal  │
│  (User authenticated)
└─────────────────┘
```

### Implementation Details

**API Route**: `/app/api/my-account-url/route.js`

**Key Components:**

1. **JWT Token Extraction**

   - Gets JWT token from `authToken` cookie
   - Token already validated during user login
   - No additional authentication needed

2. **Authorization Request**

   - Requests authorization code from Backend API
   - Includes `app` parameter (patient-portal)
   - Includes `redirect_uri` (portal callback URL)
   - Includes `state` parameter (CSRF protection)

3. **Backend Authorization**

   - Backend validates JWT token
   - Generates short-lived authorization code
   - Stores code with expiration and single-use flag
   - Returns redirect to portal with code

4. **Code Exchange**
   - Portal exchanges code for JWT tokens
   - Code is single-use and time-limited
   - State parameter validated for CSRF protection

**Environment Variables Required:**

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_PATIENT_PORTAL_URL=http://localhost:3001
```

**Code Flow:**

```javascript
// 1. Get JWT from cookies
const authToken = cookieStore.get("authToken")?.value;
const jwtToken = authToken.startsWith("Bearer ")
  ? authToken.substring(7)
  : authToken;

// 2. Generate state for CSRF protection
const state = randomBytes(32).toString("hex");

// 3. Build authorization URL
const authorizeUrl =
  `${backendUrl}/api/v1/auth/authorize?` +
  `app=patient-portal&` +
  `redirect_uri=${encodeURIComponent(redirectUri)}&` +
  `state=${encodeURIComponent(state)}`;

// 4. Request authorization with JWT
const authResponse = await fetch(authorizeUrl, {
  headers: {
    Authorization: `Bearer ${jwtToken}`,
  },
  redirect: "manual", // Capture redirect location
});

// 5. Get redirect location (contains authorization code)
const redirectLocation = authResponse.headers.get("Location");

// 6. Return redirect URL to frontend
return NextResponse.json({ success: true, url: redirectLocation });
```

### Security Characteristics

#### ✅ Security Advantages

1. **OAuth2-Like Authorization Code Flow**

   - Industry-standard authentication pattern
   - Authorization codes are short-lived (typically 5-10 minutes)
   - Codes are single-use only
   - Tokens never exposed in URLs

2. **JWT Token-Based**

   - Uses existing user session JWT
   - No service account credentials needed
   - Token has expiration and can be revoked
   - Token contains user identity and permissions

3. **CSRF Protection**

   - State parameter generated server-side
   - State validated on code exchange
   - Prevents cross-site request forgery attacks

4. **Single-Use Authorization Codes**

   - Codes can only be used once
   - Prevents replay attacks
   - Codes expire quickly

5. **No Credential Storage**

   - No service account passwords in environment
   - No base64 encoded credentials
   - Uses existing user authentication

6. **Token Scope Control**

   - Backend can enforce token scopes
   - Can limit what portal can access
   - Better access control

7. **Audit Trail**

   - Backend can log authorization events
   - Can track code generation and usage
   - Better security monitoring

8. **Loose Coupling**

   - Frontend only depends on Backend API
   - Backend handles CRM/Portal integration
   - Changes in CRM/Portal don't affect frontend

9. **Better Error Handling**

   - Standardized error responses
   - Clear error messages
   - Proper HTTP status codes

10. **Refresh Token Support**
    - Portal receives refresh token
    - Can refresh access token without re-authentication
    - Better user experience

#### ⚠️ Considerations

1. **Additional Network Round-Trips**

   - Requires code exchange step
   - Slightly more complex flow
   - Minimal performance impact

2. **Backend Dependency**
   - Requires Backend API to be available
   - Single point of failure (mitigated by proper infrastructure)

---

## 📊 Security Comparison

| Security Aspect        | Old System                         | New System                | Winner |
| ---------------------- | ---------------------------------- | ------------------------- | ------ |
| **Credential Storage** | Service account credentials in env | No credentials needed     | ✅ New |
| **Token Lifetime**     | Long-lived (1+ hours)              | Short-lived (5-10 min)    | ✅ New |
| **Token Reusability**  | Reusable multiple times            | Single-use only           | ✅ New |
| **CSRF Protection**    | ❌ None                            | ✅ State parameter        | ✅ New |
| **Token Exposure**     | Tokens in URLs                     | Tokens in secure exchange | ✅ New |
| **Audit Trail**        | Limited                            | Comprehensive             | ✅ New |
| **Token Scope**        | Full access                        | Scoped access             | ✅ New |
| **Revocation**         | Manual                             | Automatic (expiration)    | ✅ New |
| **Industry Standards** | Custom flow                        | OAuth2-like               | ✅ New |
| **Attack Surface**     | Larger                             | Smaller                   | ✅ New |

---

## 🏆 Conclusion: Which is More Secure?

### **The New System is Significantly More Secure**

#### Key Security Improvements:

1. **Elimination of Service Account Credentials**

   - Old: CRM API credentials stored in environment variables
   - New: Uses existing user JWT tokens
   - **Impact**: Removes credential compromise risk

2. **Short-Lived, Single-Use Authorization Codes**

   - Old: Long-lived auto-login links (1+ hours, reusable)
   - New: Short-lived codes (5-10 minutes, single-use)
   - **Impact**: Reduces token interception and replay attack risks

3. **CSRF Protection**

   - Old: No CSRF protection
   - New: State parameter validation
   - **Impact**: Prevents cross-site request forgery attacks

4. **No Token Exposure in URLs**

   - Old: Session tokens in auto-login URLs
   - New: Tokens exchanged via secure API calls
   - **Impact**: Prevents token leakage through browser history, logs, referrers

5. **Better Access Control**

   - Old: Full CRM access via service account
   - New: Scoped access based on user JWT
   - **Impact**: Principle of least privilege

6. **Industry-Standard Flow**
   - Old: Custom authentication flow
   - New: OAuth2-like authorization code flow
   - **Impact**: Well-tested, widely understood security pattern

### Security Score

- **Old System**: 3/10 ⚠️

  - Basic authentication
  - Multiple security vulnerabilities
  - Custom implementation

- **New System**: 9/10 ✅
  - Industry-standard flow
  - Comprehensive security measures
  - Well-architected

### Recommendation

**Migrate to the new system immediately.** The new system provides:

- ✅ Better security posture
- ✅ Industry-standard implementation
- ✅ Better maintainability
- ✅ Improved audit capabilities
- ✅ Reduced attack surface

The only trade-off is slightly more complexity, but this is far outweighed by the security benefits.

---

## 📝 Migration Checklist

If you're migrating from old to new:

- [ ] Update environment variables

  - Remove: `CRM_HOST`, `PORTAL_HOST`, `CRM_API_USERNAME`, `CRM_API_PASSWORD`
  - Add: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_PATIENT_PORTAL_URL`

- [ ] Update API route implementation

  - Replace CRM authentication logic
  - Implement authorization code flow

- [ ] Update Patient Portal

  - Implement `/auth/callback` page
  - Implement code exchange logic
  - Store tokens securely

- [ ] Test authentication flow

  - Test successful authentication
  - Test error scenarios
  - Test CSRF protection
  - Test token expiration

- [ ] Monitor and audit
  - Set up logging for authorization events
  - Monitor failed authentication attempts
  - Review audit logs regularly

---

## 🔗 Related Documentation

- [Frontend Cross-App Authentication Guide](./Untitled-1) - Complete implementation guide
- [Backend API Documentation](./cross-app-auth-implementation.md) - Backend endpoint details
- [Security Best Practices](./security-best-practices.md) - General security guidelines

---

**Last Updated**: 2025-01-XX  
**Author**: Development Team  
**Status**: ✅ New System Recommended
