# AGENTS.md - Coding Guidelines for Plaet API

## Build/Lint/Test Commands

```bash
# Development
npm run dev              # Start dev server with hot reload
npm run build            # Compile TypeScript to dist/
npm start                # Run compiled app from dist/

# Testing
npm test                 # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage report
npm run test:ci          # Run tests for CI (coverage, no watch)
npm run test:integration # Run integration tests only
npm run test:e2e         # Run e2e tests only
npm run test:all         # Run unit + integration + e2e tests

# Run a single test file
npx jest src/path/to/file.test.ts
npx jest --testNamePattern="test name pattern"

# Linting/Formatting
npm run eslint-check-only    # Check ESLint issues
npm run eslint-fix           # Fix ESLint issues automatically
npm run prettier             # Format all files with Prettier

# Database (Prisma)
npm run prisma:generate      # Generate Prisma client
npm run prisma:migrate       # Deploy migrations
npm run prisma:seed          # Run database seeds
npm run prisma:reset         # Reset database (dev only)

# Test Database
npm run test:db:start        # Start test database container
npm run test:db:stop         # Stop test database container
npm run test:db:reset        # Reset test database
npm run test:db:migrate      # Run migrations on test DB
npm run test:db:status       # Check test DB status
```

## Code Style Guidelines

### TypeScript Configuration

- Target: ES2016, Module: CommonJS
- Strict mode enabled, source maps enabled
- Output: `dist/`, Root: `src/`

### Imports/Exports

- Use ES modules (`import`/`export`)
- Group: 1) External libs, 2) Internal, 3) Types
- Use `@/` path alias mapped to `src/`
- Prefer named exports for utilities

### Formatting (Prettier)

- Semicolons: required, Quotes: double
- Tab width: 2, Trailing commas: all

### ESLint Rules

- TypeScript recommended + Prettier integration
- Unused vars: warn (ignore `_` prefix)
- `no-console`: warn (use Winston logger)
- **Strings: ALWAYS use double quotes (`"`)** - Single quotes will fail
- **Semicolons: ALWAYS required at end of statements**
- **Trailing commas: Use `all` (include in multi-line objects/arrays)**
- **Tab width: 2 spaces**
- **Max line length: 80 characters**

### ESLint Commands Reference

```bash
# Check all ESLint issues
npm run eslint-check-only

# Auto-fix ESLint issues where possible
npm run eslint-fix

# Format with Prettier only
npm run prettier

# Check specific file
npx eslint src/path/to/file.ts

# Fix specific file
npx eslint src/path/to/file.ts --fix
```

### Common ESLint Errors & Fixes

| Error                               | Cause                 | Solution                               |
| ----------------------------------- | --------------------- | -------------------------------------- |
| `prettier/prettier`                 | Formatting mismatch   | Run `npm run prettier` or fix manually |
| `quotes`                            | Using single quotes   | Replace `'` with `"`                   |
| `no-console`                        | Using `console.log()` | Use `logger.info()` from Winston       |
| `unused vars`                       | Declared but unused   | Remove variable or prefix with `_`     |
| `@typescript-eslint/no-unused-vars` | Unused parameters     | Prefix with `_` (e.g., `_req`)         |

### Code Formatting Rules

**Strings:**

```typescript
// ❌ INCORRECT
const name = "John";
const message = `Hello ${name}`;

// ✅ CORRECT
const name = "John";
const message = `Hello ${name}`; // Template literals OK for interpolation
```

**Objects & Arrays (Trailing Commas):**

```typescript
// ❌ INCORRECT
const user = {
  name: "John",
  email: "john@example.com", // Missing trailing comma
};

// ✅ CORRECT
const user = {
  name: "John",
  email: "john@example.com", // Trailing comma present
};
```

**Function Parameters:**

```typescript
// ❌ INCORRECT - Unused parameter without underscore
app.use((req, res, next) => { ... });

// ✅ CORRECT - Prefix unused params with underscore
app.use((_req, res, next) => { ... });
```

**Logging (Never use console in production code):**

```typescript
// ❌ INCORRECT
console.log("User logged in");

// ✅ CORRECT
import { logger } from "./config/logger";
logger.info("User logged in");
```

### Files to Exclude from ESLint

The following files/dirs are excluded in `.eslintignore`:

- `dist/` - Compiled output
- `coverage/` - Test coverage reports
- `node_modules/` - Dependencies
- `*.js` in coverage directories

### Pre-Commit Checklist

Before committing code, always run:

```bash
npm run eslint-check-only
```

If there are errors, fix them with:

```bash
npm run eslint-fix  # Auto-fixes formatting issues
# Then manually fix remaining issues
```

### Naming Conventions

- Files: kebab-case (`user.controller.ts`)
- Classes: PascalCase, Functions: camelCase
- Constants: UPPER_SNAKE_CASE
- Enums: PascalCase, members UPPER_SNAKE_CASE
- Test files: `*.test.ts`

### Error Handling

- Use `CustomError` with `errorCode` for app errors
- Use `HttpStatus` enum for status codes
- Wrap async handlers with `asyncHandler()`
- **Always use try/catch with async/await, never `.then()` without `.catch()`**
- Log with Winston, not console

### Project Structure

```
src/
  api/{feature}/
    *.controller.ts   # Route handlers
    *.service.ts      # Business logic
    *.repository.ts   # Database access
    *.route.ts        # Route definitions
    *.validator.ts    # Zod schemas
    interfaces/       # Feature types
  config/             # Configuration
  database/           # Prisma client
  middlewares/        # Express middlewares
  strategies/         # Passport strategies
  types/              # Global types
  utils/              # Utilities
  interfaces/         # Shared interfaces
```

### Testing Patterns

- Unit: `src/**/__tests__/unit/*.test.ts`
- Integration: `src/**/__tests__/integration/*.test.ts`
- Structure: Arrange -> Act -> Assert
- Mock external dependencies
- **Coverage threshold: 80% all metrics**

### Database (Prisma)

- Use repository pattern
- **Multiple orderBy: use array `[{field: 'asc'}, {field2: 'asc'}]`**
- Handle errors: P2002 (duplicate), P2025 (not found)
- Use transactions for multi-table ops

### API Response Format

```typescript
// Success
{ success: true, message: "...", data: {}, meta: {} }

// Error
{ success: false, message: "...", errorCode: "...", meta: {} }
```

### Security

- Helmet in production, CORS whitelist
- JWT via Passport, bcrypt for passwords
- Zod validation for all inputs

### Claude Code Best Practices

- Use plan mode for complex tasks: "Entra en modo plan antes de implementar"
- After corrections: "Actualiza CLAUDE.md para no repetir ese error"
- Use subagents for parallel tasks: "usa subagentes"
- Bug fixes: Paste error and say "fix" without micromanaging
- Maintain `/notes` directory for task-specific docs

### Testing Checklist (Before Merging)

- [ ] All tests pass (`npm test`)
- [ ] Coverage >= 80% (`npm run test:coverage`)
- [ ] ESLint passes (`npm run eslint-check-only`)
- [ ] TypeScript compiles (`npm run build`)
- [ ] No console errors in test output

### Environment Variables

Key vars in `.env.example`:

- `DATABASE_URL` - PostgreSQL connection
- `JWT_SECRET` - JWT signing secret
- `PORT` - Server port
- `NODE_ENV` - Environment mode
- `CORS_ORIGIN` - Allowed origins

---

## 🔐 Authentication Module Documentation

### Overview

The authentication module implements a comprehensive security system with JWT tokens, httpOnly cookies, token blacklisting, and multiple security features following industry best practices.

### Features Implemented

| Feature                | Status      | Description                     |
| ---------------------- | ----------- | ------------------------------- |
| User Registration      | ✅ Complete | With email verification         |
| User Login             | ✅ Complete | With account lockout protection |
| User Logout            | ✅ Complete | Blacklists all tokens           |
| Token Refresh          | ✅ Complete | With token rotation             |
| Password Reset         | ✅ Complete | Secure flow with email          |
| Change Password        | ✅ Complete | Requires current password       |
| Email Verification     | ✅ Complete | Automatic on registration       |
| Account Lockout        | ✅ Complete | After 5 failed attempts         |
| Rate Limiting          | ✅ Complete | On all public endpoints         |
| Strong Password Policy | ✅ Complete | 12+ chars, complexity rules     |

### API Endpoints

#### Public Endpoints (No Authentication Required)

```typescript
POST /auth/register              # Register new user + sends verification email
POST /auth/login                 # Authenticate user
POST /auth/forgot-password       # Request password reset email
POST /auth/reset-password        # Reset password with token
POST /auth/verify-email          # Verify email with token
POST /auth/resend-verification   # Resend verification email
POST /auth/refresh-token         # Refresh access/refresh tokens
```

#### Protected Endpoints (Authentication Required)

```typescript
POST /auth/logout                # Logout user (blacklists tokens)
POST /auth/change-password       # Change password (invalidates all sessions)
```

### Security Features

#### 1. Token Storage Strategy

**Access Token:**

- Stored in httpOnly cookie
- Expiration: 30 minutes (configurable)
- Also extractable from Authorization header
- Stored in database for blacklisting

**Refresh Token:**

- Stored in httpOnly cookie
- Expiration: 7 days (configurable)
- Rotated on every use (old token blacklisted)
- Detects token reuse attacks

#### 2. Token Blacklisting

All tokens are stored in the database with:

- User ID association
- Token type (ACCESS, REFRESH, RESET_PASSWORD, VERIFY_EMAIL)
- Expiration date
- Blacklist status
- Creation timestamp

**Blacklisting occurs on:**

- User logout (all user tokens)
- Password reset (reset token)
- Password change (all user tokens)
- Email verification (verification token)
- Token refresh (old refresh token)

#### 3. Account Lockout (Brute Force Protection)

After **5 failed login attempts**:

- Account is locked for **15 minutes**
- Returns HTTP 423 (Locked) with time remaining
- Failed attempts counter reset on successful login
- Prevents automated brute force attacks

#### 4. Strong Password Policy

Passwords must have:

- Minimum 12 characters
- Maximum 128 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character
- Cannot contain common patterns ("password", "123456", etc.)

#### 5. Email Verification Flow

1. User registers → verification email sent automatically
2. User clicks link → email verified
3. Can resend verification if needed
4. Prevents enumeration (always returns success)

#### 6. Password Reset Flow

1. User requests reset → email sent with token (1 hour validity)
2. User clicks link → token validated
3. User sets new password → token blacklisted
4. All sessions invalidated → must login again

#### 7. Security Headers & Cookies

**Cookie Settings:**

```typescript
{
  httpOnly: true,        // Not accessible via JavaScript
  secure: true,          // HTTPS only in production
  sameSite: "strict",    // CSRF protection
  maxAge: 30*60*1000,    // 30 minutes (access) / 7 days (refresh)
  path: "/",
}
```

**Rate Limiting:**

- 5 requests per 15 minutes on auth endpoints
- Prevents brute force and abuse

### Database Schema (Auth-Related)

```prisma
model User {
  // Basic fields
  id        String  @id @default(uuid())
  email     String  @unique
  password  String

  // Email verification
  emailVerified   Boolean  @default(false)
  emailVerifiedAt DateTime?

  // Account lockout
  failedLoginAttempts Int       @default(0)
  lockedUntil         DateTime?
  lastFailedLogin     DateTime?

  // Password tracking
  passwordChangedAt DateTime?
}

model Token {
  id          String    @id @default(uuid())
  token       String
  type        TokenType // ACCESS, REFRESH, RESET_PASSWORD, VERIFY_EMAIL
  expires     DateTime
  blacklisted Boolean   @default(false)
  createdAt   DateTime  @default(now())
  userId      String
  user        User      @relation(fields: [userId], references: [id])
}
```

### Token Types

```typescript
enum TokenType {
  ACCESS           // Short-lived API tokens (30 min)
  REFRESH          // Long-lived session tokens (7 days)
  RESET_PASSWORD   // One-time password reset (1 hour)
  VERIFY_EMAIL     // One-time email verification (24 hours)
}
```

### Email Configuration

Environment variables for email:

```bash
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
FROM_EMAIL=noreply@yourapp.com
CLIENT_URL=http://localhost:5173  # Frontend URL for links
```

**Development Mode:**

- Emails are logged to console instead of being sent
- Reset/verification URLs printed in logs

### Error Codes

| Error Code                   | HTTP Status | Description                        |
| ---------------------------- | ----------- | ---------------------------------- |
| `BAD_REQUEST`                | 400         | Invalid credentials                |
| `UNAUTHORIZED_ACCESS`        | 401         | No valid token                     |
| `TOKEN_REVOKED`              | 401         | Token was blacklisted              |
| `FORBIDDEN`                  | 403         | Insufficient permissions           |
| `NOT_FOUND`                  | 404         | User not found                     |
| `CONFLICT`                   | 409         | Email already exists               |
| `ACCOUNT_LOCKED`             | 423         | Account temporarily locked         |
| `INVALID_RESET_TOKEN`        | 400         | Expired/invalid reset token        |
| `INVALID_VERIFICATION_TOKEN` | 400         | Expired/invalid verification token |
| `REFRESH_TOKEN_MISSING`      | 401         | No refresh token in cookies        |
| `INVALID_REFRESH_TOKEN`      | 401         | Refresh token invalid/expired      |
| `INVALID_CURRENT_PASSWORD`   | 400         | Current password incorrect         |

### Implementation Details

#### Token Rotation (Security Best Practice)

```typescript
// On refresh token request:
1. Validate refresh token
2. Check if blacklisted (detects reuse)
3. Blacklist old refresh token
4. Generate new token pair
5. Return new tokens
```

This prevents:

- Token replay attacks
- Stolen token usage
- Session hijacking

#### Email Enumeration Prevention

```typescript
// Forgot password endpoint always returns:
{
  success: true,
  message: "If an account exists with this email, you will receive..."
}

// Same for resend verification
```

#### Security Logging

All auth operations are logged:

```typescript
logger.info("[LOGIN] User logged in", { userId });
logger.warn("[REFRESH] Token reuse detected", { userId });
logger.info("[PASSWORD_RESET] Email sent", { email });
```

### Testing Authentication

```bash
# Test login
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePass123!"}'

# Test with cookies (save them)
curl -X POST http://localhost:8080/api/v1/auth/login \
  -c cookies.txt \
  -d '{"email":"user@example.com","password":"SecurePass123!"}'

# Access protected endpoint with cookies
curl http://localhost:8080/api/v1/profile/me \
  -b cookies.txt

# Refresh tokens
curl -X POST http://localhost:8080/api/v1/auth/refresh-token \
  -b cookies.txt

# Logout (blacklists tokens)
curl -X POST http://localhost:8080/api/v1/auth/logout \
  -b cookies.txt
```

### Security Checklist

Before deploying to production:

- [ ] Set strong `JWT_SECRET` (min 32 characters)
- [ ] Configure SMTP credentials for email
- [ ] Set `NODE_ENV=production`
- [ ] Enable HTTPS (cookies secure flag)
- [ ] Configure CORS whitelist
- [ ] Set up rate limiting (already enabled)
- [ ] Enable Helmet security headers
- [ ] Configure Winston logger
- [ ] Run `npm run prisma:migrate` for new fields
- [ ] Test all auth flows end-to-end
- [ ] Verify email templates
- [ ] Test token expiration scenarios

### Additional Security Recommendations

For even higher security, consider:

1. **Two-Factor Authentication (2FA)**

   - TOTP (Time-based One-Time Password)
   - SMS verification
   - Email codes

2. **Device Fingerprinting**

   - Track device ID/browser fingerprint
   - Alert on new device login
   - Require email verification for new devices

3. **Session Management UI**

   - List active sessions
   - Revoke specific sessions
   - Show login history

4. **Advanced Password Policies**

   - Password history (prevent reuse)
   - Breach detection (HaveIBeenPwned API)
   - Regular forced password changes

5. **OAuth/Social Login**
   - Google OAuth
   - Facebook Login
   - Microsoft/Apple Sign In

### References

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [Token Rotation Pattern](https://auth0.com/docs/secure/tokens/refresh-tokens/refresh-token-rotation)
- [Passport.js Documentation](http://www.passportjs.org/docs/)
