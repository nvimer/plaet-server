# Errors and Solutions (Troubleshooting Guide)

This document serves as a centralized log for issues, errors, and their corresponding solutions encountered during the development, testing, and deployment of the Plaet API project. It will be useful for building out the final product documentation.

---

## 🚀 Deployment Errors

### 1. Prisma Seed Failure Before Migration

**Context:** During the deployment process on Railway, the database seeding step was failing with an error indicating that the tables did not exist.
**Error message:**

```
Invalid `prisma.restaurant.upsert()` invocation:
The table `public.restaurants` does not exist in the current database.
```

**Root Cause:** The `startCommand` in `railway.toml` was configured to run `npx prisma db seed && npm start`. In `package.json`, `npm start` ran the migrations (`npx prisma migrate deploy`). Thus, the seed script was executing before the tables were created by the migration script.
**Solution:**
Updated the `startCommand` in `railway.toml` to ensure migrations run strictly before seeding:

```toml
startCommand = "npx prisma migrate deploy && npx prisma db seed && node dist/server.js"
```

### 2. Deprecated Prisma Configuration Warning

**Context:** When running Prisma commands, a warning was printed in the logs regarding the Prisma configuration in `package.json`.
**Error message:**

```
warn The configuration property `package.json#prisma` is deprecated and will be removed in Prisma 7. Please migrate to a Prisma config file (e.g., `prisma.config.ts`).
```

**Solution:**
Initially attempted to create a `prisma.config.ts` file, but encountered a `Failed to parse syntax of config file` error when running Prisma Studio because the project uses CommonJS and Prisma's internal ES module loader failed to parse the default export in TypeScript correctly. 

The workaround was to simply ignore the warning and keep the configuration inside `package.json`:
```json
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
```

---

## 🧪 Testing Errors

### 1. Relative Paths and Undefined References

**Context:** When executing unit tests (e.g., `orders/__tests__/unit/`), TypeScript complained about missing modules and unknown variables.
**Error message:**

```
error TS2307: Cannot find module '../order.service'
error TS2304: Cannot find name 'Prisma'
```

**Root Cause:**

- Incorrectly calculated relative paths for imports.
- Missing dependencies or unimported modules (e.g., `@prisma/client` for `Prisma.Decimal`).
  **Solution:**
- Fix relative paths (e.g., change `../order.service` to `../../order.service`).
- Import required dependencies properly.
- Ensure test fixtures are properly defined in `fixtures/` directories and imported correctly.

### 2. Faker ES Module Resolution in Jest

**Context:** Tests failing due to an import statement issue with `@faker-js/faker`.
**Error message:**

```
SyntaxError: Cannot use import statement outside a module
at @faker-js/faker/dist/index.js
```

**Root Cause:** `@faker-js/faker` v10.2.0 uses ES modules (`"type": "module"`), while Jest defaults to expecting CommonJS, causing the transformation to fail or misinterpret the imports.
**Solution:**
Use manual mocks for `@faker-js/faker` inside the test files to circumvent the ES module resolution issues, or configure Jest's `transformIgnorePatterns` to handle the module properly.

### 3. Integration Tests: Items Not Found in Transactions

**Context:** Integration tests involving inventory and stock types were failing because the `MenuItem` was not found during a transaction block.
**Error message:**

```
CustomError: Menu Item ID X not found
at ItemService.setInventoryType
```

**Root Cause:**

- Soft-delete Prisma extensions were not uniformly applied on the test client, causing `findUnique` to misbehave when combined with `deleted: false` conditions or inside transactions.
- Potential race conditions or synchronization issues when creating items and reading them within a transaction immediately after.
  **Solution:**
  Use `findFirst` instead of `findUnique` inside the transactions to manually filter by `deleted: false`, working around the lack of soft-delete extensions in the test environment setup.

---

_(Append any future errors and solutions below this line)_

## 🐛 API Runtime Errors

### 1. Null Constraint Violation for `restaurant_id`

**Context:** When attempting to create a `DailyMenu` via the `POST /api/v1/daily-menu/:date` endpoint, a Prisma error was thrown.
**Error message:**

```
Invalid `this.prismaClient.dailyMenu.create()` invocation
Null constraint violation on the fields: (`restaurant_id`)
```

**Root Cause:**

- The project implements a global Prisma extension that intercepts queries to achieve multi-tenancy. For `CREATE` operations, it automatically injects `restaurantId` from the `tenantContext` (using `AsyncLocalStorage`).
- The `tenantMiddleware` which was responsible for establishing this context was applied globally in `src/app.ts` _before_ the API routes, meaning it executed _before_ `passport.authenticate("jwt")` (inside `authJwt`). Consequently, `req.user` was always undefined when `tenantMiddleware` ran, leaving the `tenantContext` empty. When Prisma intercepted the query, there was no `restaurantId` to inject, violating the database constraints.
  **Solution:**
- Removed `tenantMiddleware` from `src/app.ts`.
- Integrated the context initialization directly inside `authJwt` and `authJwtOptional` in `src/middlewares/auth.middleware.ts`. Right after `req.user = user;`, we now call `tenantContext.run({ restaurantId: user.restaurantId }, () => next());`, guaranteeing that the tenant context correctly wraps the entire authenticated request lifecycle.
