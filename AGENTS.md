# AGENTS.md - Coding Guidelines & Context for AI Agents

Welcome, fellow AI Agent! This document contains all the necessary context, rules, and architectural decisions for the Plaet API project. Read this thoroughly before making any changes.

## 🍽 Project Domain: Plaet API (Restaurant Management)

Plaet API is an enterprise-level backend API for managing restaurant operations. It handles users, customers, tables, orders, menus, and inventory.

### Core Domain: The "Corrientazo" (Daily Menu)
A critical feature of this system is the **Corrientazo** (Colombian daily lunch menu). 
**IMPORTANT:** The database schema (`prisma/schema.prisma`) uses a highly structured model for `DailyMenu`, differing from older documentation.
- **Pricing:** The total price of a Corrientazo is calculated as `basePrice` + `price of the selected protein(s)`.
- **Structure:** `DailyMenu` references specific `MenuItem`s through IDs (e.g., `soupOption1Id`, `principleOption1Id`) and `MenuCategory`s.
- **Proteins:** `proteinIds` is an array of IDs representing the available meat/protein options for the day.

## 🏗️ Project Architecture & Structure

The project follows a layered architecture (Controller -> Service -> Repository) built with Node.js, Express, TypeScript, and Prisma.

```text
src/
├── api/                     # Feature modules
│   ├── auth/                # JWT Authentication, login, register, password reset
│   ├── customers/           # Customer management & ticket books (tiqueteras)
│   ├── daily-menu/          # Corrientazo daily menu logic
│   ├── menus/               # Categories, Menu Items, Stock management
│   ├── orders/              # Order lifecycle & items
│   ├── permissions/         # Granular permissions
│   ├── profiles/            # User profiles
│   ├── roles/               # RBAC (Admin, Cashier, Waiter, Kitchen Manager)
│   ├── tables/              # Restaurant tables
│   └── users/               # User management
├── config/                  # Environment, logger, swagger, email
├── database/                # Prisma client
├── middlewares/             # Auth, error handling, rate limiting
├── types/                   # Custom Express & Prisma types
└── utils/                   # Helpers, AsyncHandler, Pagination
```

## 🛠️ Build/Lint/Test Commands

```bash
# Development
npm run dev              # Start dev server with hot reload
npm run build            # Compile TypeScript to dist/

# Testing (Jest)
npm test                 # Run all tests
npm run test:coverage    # Run tests with coverage report
npm run test:ci          # Run tests for CI
npm run test:integration # Run integration tests
npm run test:e2e         # Run e2e tests

# Linting/Formatting
npm run eslint-check-only    # Check ESLint issues
npm run eslint-fix           # Fix ESLint issues automatically
npm run prettier             # Format all files with Prettier

# Database (Prisma)
npm run prisma:generate      # Generate Prisma client
npm run prisma:migrate       # Deploy migrations
npm run test:db:migrate      # Run migrations on test DB

# Maintenance
npx knip                 # Find unused files, exports, and dependencies
```

## 🤖 AI Agent Guidelines (Crucial)

When acting on this codebase, adhere strictly to these rules:

### 1. Code Style & Formatting
- **Strings:** ALWAYS use double quotes (`"`). Single quotes will fail ESLint.
- **Semicolons:** ALWAYS required at the end of statements.
- **Trailing commas:** Use `all` (include in multi-line objects/arrays).
- **Tab width:** 2 spaces. Max line length: 80 characters.
- **Unused variables:** Prefix with `_` (e.g., `_req`, `_res`).

### 2. Error Handling & Logging
- **Try/Catch:** Always use try/catch with async/await. NEVER use `.then()` without `.catch()`.
- **Custom Errors:** Use `CustomError` with HTTP status codes for all business logic failures.
- **Logging:** NEVER use `console.log()` in production code. Always use `import { logger } from "@/config/logger";` and `logger.info()`, `logger.error()`.

### 3. Database & Migrations
- **Prisma Schema:** If you modify `prisma/schema.prisma`, you MUST run `npx prisma migrate dev --name <migration_name>` to generate a migration file. 
- **Repository Pattern:** Do not call Prisma directly in Controllers or Services if a Repository exists. Always pass through the Repository layer.
- **Transactions:** Use Prisma transactions for multi-table operations (e.g., creating an order and deducting stock).

### 4. Testing
- If you add a feature, add tests.
- Maintain at least 80% coverage. 
- Before assuming a task is done, run `npm run eslint-check-only` and `npm run build` to verify no breaking changes.

### 6. Authentication Best Practices (Session Protection)
- **AccessToken-Only Sessions:** Protected routes (via `authJwt`) MUST ONLY extract the `accessToken` from cookies or headers. The `refreshToken` should ONLY be used in the `/refresh-token` endpoint.
- **Refresh Token Rotation (Race Condition Handling):** If a `refreshToken` is reuse-detected (it was already rotated), do NOT execute a global user logout. Instead, just reject that specific request. This prevents infinite loops caused by parallel refresh requests from the frontend.
- **Token Type Validation:** Always verify the `type` field in the JWT payload during strategy validation to ensure an `ACCESS` token isn't being used as a `REFRESH` token and vice versa.

## 🔐 Authentication Module Documentation

The auth module uses JWT tokens stored in `httpOnly` cookies with token blacklisting, rotation, and account lockout protection.

- **Tokens:** `ACCESS` (30 min), `REFRESH` (7 days, rotated on use), `RESET_PASSWORD` (1 hour), `VERIFY_EMAIL` (24h).
- **Blacklisting:** Handled via the `Token` model in the database.
- **Brute Force Protection:** Account locked for 15 mins after 5 failed attempts.
- **Rate Limiting:** Applied to all public endpoints.
- **Email:** Verification and password resets send actual emails via Nodemailer.

**Testing Auth flow:**
Login sets cookies. Make sure to pass cookies to protected routes when testing with curl or Postman.

## 📝 Best Practices For AI Output
- Do not repeat file contents unnecessarily. Provide precise replacements.
- If an API response structure is changed, update the Swagger docs located in `docs/` and `src/config/swagger.ts`.
- Understand the existing validation schemas (Zod) in `*.validator.ts` files before modifying endpoints.