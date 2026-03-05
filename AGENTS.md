# AGENTS.md - Coding Guidelines for AI & Developers (Server)

This document defines the critical technical rules and architectural patterns for the Plaet API.

## 🏢 Multi-Tenant SaaS Architecture

### 1. Data Isolation (Prisma Extensions)
- **Automatic Multi-Tenancy:** We use Prisma Client extensions to automatically filter all queries by `restaurantId`. 
- **Tenancy Context:** The `restaurantId` is extracted from the JWT and stored in the request context.
- **Rule:** Never manually filter by `restaurantId` in repositories unless specifically working on a cross-tenant global analytics module (SuperAdmin only).
- **SuperAdmin:** The `SUPERADMIN` role bypasses all tenant filters to allow global management.

### 2. Access Control (RBAC)
- **Granular Permissions:** Routes MUST be protected using `permissionMiddleware("module:action")`.
- **RBAC Hierarchy:** Roles are collections of granular permissions. The `SUPERADMIN` role bypasses all individual permission checks.
- **Service Layer Security:** While routes handle initial checks, critical business logic in services should also verify ownership and permissions if necessary.

## 🏗️ Technical Architecture

### 1. Modular Pattern (Route -> Controller -> Service -> Repository)
Every business module in `src/api/` must follow this structure:
- **Interfaces:** Define contracts for Services and Repositories to allow easy testing and mocking.
- **Validators (Zod):** Every request (body, query, params) must be validated at the route level.
- **Controllers:** Handle HTTP concerns (parsing request, calling service, sending response). Use `asyncHandler`.
- **Services:** Centralize business logic. They should be agnostic of HTTP and work with data objects.
- **Repositories:** Handle direct database interactions using Prisma.

### 2. Error Handling
- **CustomError:** Use the `CustomError` class for all expected failures (404, 400, 403, etc.).
- **Centralized Middleware:** Errors thrown in services or controllers are caught by the `error.middleware.ts`.
- **Validation Errors:** Handled automatically by the `validate` middleware using Zod.

## 🚀 Performance & Scalability
- **Complexity:** Prioritize O(1) or O(log N) lookups. Avoid nested loops that result in O(N^2) complexity.
- **N+1 Prevention:** Always use Prisma's `include` or `select` to fetch related data in a single query.
- **Pagination:** All list endpoints MUST support pagination using `PaginationParams` and return a `PaginatedResponse`. Use `DEFAULT_PAGE` and `DEFAULT_LIMIT`.

## 🛠️ Quality Standards
- **Strict Typing:** NO `any` or `unknown`. Use `AuthenticatedUser` for `req.user` casting.
- **Logging:** Use the centralized `logger` (Winston/Morgan). Raw `console.log` is strictly forbidden in production code.
- **Seeds:** When adding new permissions or system roles, update `prisma/seeds/permissions.seed.ts` and `prisma/seeds/roles.seed.ts`.
- **Prisma Schema:** Maintain the schema clean and use `@map` for snake_case column names in PostgreSQL.

## 🧪 Testing Guidelines
- **Unit Tests:** Focus on service logic using mocked repositories.
- **Integration Tests:** Test the full API flow from route to DB using a test database.
- **Cleanup:** Ensure tests are isolated and database state is reset between runs.
