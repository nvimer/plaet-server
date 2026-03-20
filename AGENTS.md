# Agentic Coding Guidelines (Plaet Server)

Welcome! You are an AI agent operating in the Plaet Server API. This is a Node.js + Express + Prisma backend for a multi-tenant restaurant management SaaS.

---

## 1. Build, Lint, and Test Commands

### Installation

```bash
npm install
```

### Development & Build

```bash
npm run dev          # Run with ts-node and nodemon (auto-reload)
npm run build        # Compile TypeScript to dist/
npm start            # Production: migrate + start compiled
```

### Linting & Formatting

```bash
npm run eslint-check-only  # Check lint errors
npm run eslint-fix        # Auto-fix lint errors
npm run prettier          # Format all files (double quotes, semi-colons)
```

### Testing

```bash
npm run test           # Run all tests
npm run test:watch     # Watch mode for development
npm run test:coverage  # Coverage report

# Single test file (Jest accepts regex pattern)
npm test -- orders.service.test.ts
npm run test:watch -- --testPathPattern="order.repository"

npm run test:integration  # Integration tests (requires TEST_TYPE=integration)
npm run test:e2e          # End-to-end tests (requires TEST_TYPE=e2e)
npm run test:all          # Run unit + integration + e2e sequentially
```

### Test Database Management

```bash
npm run test:db:start    # Start test PostgreSQL container
npm run test:db:stop     # Stop container
npm run test:db:reset     # Reset database
npm run test:db:migrate  # Run migrations on test DB
npm run test:db:status   # Check container status
```

### Prisma

```bash
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Apply migrations
npm run prisma:seed      # Seed database
npm run prisma:studio    # Open Prisma Studio GUI
npm run prisma:reset     # Reset migrations (DANGEROUS)
```

---

## 2. Code Style & Conventions

### TypeScript Configuration

- Strict mode enabled (all strict checks)
- Module: CommonJS
- Paths: Use `@/` alias for `src/` directory
- JSON modules: enabled (resolveJsonModule)

### Formatting Rules

- **Quotes**: Double quotes (`"`)
- **Semicolons**: Always required
- **Trailing commas**: All (ES5+)
- **Tab width**: 2 spaces
- **Single quotes**: Disabled

### Naming Conventions

| Element             | Convention                    | Example                           |
| ------------------- | ----------------------------- | --------------------------------- |
| Files               | kebab-case                    | `order.service.ts`                |
| Classes             | PascalCase                    | `OrderService`                    |
| Interfaces          | PascalCase + Interface suffix | `OrderServiceInterface`           |
| Variables/Functions | camelCase                     | `createOrder`, `orderData`        |
| Constants           | UPPER_SNAKE_CASE              | `MAX_ITEMS`                       |
| Types               | PascalCase                    | `OrderStatus`, `PaginationParams` |
| Enums               | PascalCase members            | `OrderStatus.PENDING`             |

### Imports

```typescript
// Use import type for type-only imports
import type { OrderServiceInterface } from "./interfaces";
import type { CustomErrorInterface } from "../../types";

// Regular imports
import { Order } from "@prisma/client";
import { CustomError } from "../../types/custom-errors";

// Internal path alias
import { paginationHelper } from "@/utils/pagination.helper";
```

### Types & TypeScript

- **STRICT ZERO TOLERANCE** for `any` or `unknown` - always define explicit types
- Use `import type` for interfaces and type definitions
- Use `Prisma.Decimal` for monetary values (never use number for money)
- Define interfaces for all services (`*ServiceInterface` suffix)

### Error Handling

- Use `CustomError` class for expected failures (validation, not found, etc.)
- Use Winston logger (never raw `console.log`)
- All errors should have `statusCode` and optional `errorCode`

```typescript
throw new CustomError(
  "Order not found",
  HttpStatus.NOT_FOUND,
  "ORDER_NOT_FOUND",
);
```

### Validation

- Use **Zod** for all input validation (request bodies, query params)
- For optional DB fields (`String?`), use `.optional().nullable()` in Zod schemas

### Logging

```typescript
import { logger } from "@/config/logger";

logger.info("Message with context", { userId, action });
logger.error("Error occurred", { error: err.message, stack });
```

---

## 3. Architecture

### Directory Structure

```
src/
  api/{module}/
    {module}.route.ts      # Express routes
    {module}.controller.ts # Request handling
    {module}.service.ts    # Business logic
    {module}.repository.ts # Data access
    {module}.validator.ts  # Zod schemas
    interfaces/            # Contract definitions
    services/              # Sub-services (for large modules)
    __tests__/             # Tests (unit/, integration/, e2e/, helpers/)
  config/                  # App configuration
  database/                # Prisma client setup
  middlewares/             # Express middleware
  types/                  # TypeScript types
  utils/                  # Utilities
```

### Layered Modular Pattern

```
Route -> Controller -> Service -> Repository
```

- Routes define endpoints and apply middleware
- Controllers handle request/response (use `asyncHandler`)
- Services contain business logic (can be split into sub-services)
- Repositories handle data access via Prisma

### Large Service Splitting

Services that exceed ~200 lines MUST be split:

```typescript
// order.service.ts
export class OrderService {
  private creationService: OrderCreationService;
  private statusService: OrderStatusService;
  // ...
}
```

---

## 4. Multi-Tenant Architecture (CRITICAL)

### Server-Side

- Prisma Client extensions automatically filter all queries by `restaurantId`
- **NEVER manually filter by `restaurantId`** in repositories (except for SUPERADMIN analytics)
- `restaurantId` is extracted from JWT and set via `tenantContext`
- Global queries (cross-tenant) use `getBasePrismaClient()`

### Security

- Soft delete enforced at Prisma extension level
- All tenant-aware models checked on `findUnique`, `update`, `findMany`
- Unauthorized cross-tenant access returns `null` (not 403)

---

## 5. Testing Patterns

### Test Structure

```
__tests__/
  unit/           # Isolated service/repository tests
  integration/    # API endpoint tests with test DB
  e2e/            # Full flow tests
  helpers/        # Fixtures and mock factories
```

### Mocking Prisma

```typescript
// Mock BEFORE imports
const mockPrismaClient = {
  order: { findUnique: jest.fn(), create: jest.fn() /* ... */ },
  $transaction: jest.fn(),
};

jest.mock("../../../../database/prisma", () => ({
  default: { $transaction: mockPrismaClient.$transaction },
  getPrismaClient: jest.fn(() => mockPrismaClient),
}));
```

### Fixtures Pattern

```typescript
export function createOrderFixture(
  overrides: Partial<Record<string, unknown>> = {},
) {
  return {
    id: "default-id",
    status: OrderStatus.PENDING,
    createdAt: new Date("2024-01-01T12:00:00.000Z"),
    ...overrides,
  };
}
```

### Test Requirements

- Coverage threshold: 80% (branches, functions, lines, statements)
- All tests must pass before declaring task complete
- Integration tests require running test database

---

## 6. Access Control (RBAC)

- Use `permissionMiddleware("module:action")` for route protection
- Permissions follow pattern: `{resource}:{action}`
- SuperAdmin bypasses all permission checks
- Users can always access their own roles/permissions (`/users/:id` with own ID)

---

## 7. API Documentation

- Swagger docs located in `./docs/**/*.yaml`
- Access at `/api/v1/docs` when server running
- JSON spec at `/api/v1/docs.json`

---

## 8. Git Workflow

- Branch naming: `feature/`, `bugfix/`, `refactor/`, `perf/`
- Small, atomic commits
- Conventional Commits standard
- Run lint and tests before committing

---

## 9. Language Policy

- **English ONLY** for code, comments, commits, documentation
- **Spanish ONLY** for user-facing UI strings (errors, labels, messages)
- No emojis in commits or code comments
