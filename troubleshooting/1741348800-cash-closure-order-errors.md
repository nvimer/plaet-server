# Cash Closure Not Found When Creating Orders

- **ID:** 1741348800
- **Date:** 2026-03-07
- **Description:** When trying to create an order, the error "No hay un turno de caja abierto. Por favor abre caja antes de crear pedidos" was returned even though a cash closure was already open.
- **Root Cause:** The `findCurrentOpen()` method in `CashClosureRepository` was not using the tenant context correctly. The Prisma extension filters queries by `restaurantId` automatically, but the repository was either:

  1. Not receiving the `restaurantId` from the service, or
  2. Using `getBasePrismaClient()` to bypass the extension, which caused filter conflicts

- **Solution:** Refactored `findCurrentOpen()` in `cash-closure.repository.ts` to:

  1. Always use the extended `prisma` client (never bypass)
  2. Read tenant context via `tenantContext.getStore()`
  3. Throw an explicit error if context is missing (fails fast instead of silent wrong results)

  This approach is more robust because it:

  - Keeps soft-delete and other extension filters working
  - Provides clear error messages when middleware fails
  - Follows the intended architecture of tenant isolation

- **Files Changed:**
  - `src/api/cash-closures/cash-closure.repository.ts`

---

# Order Auto-Cancel Job Failing - Missing Column

- **ID:** 1741348801
- **Date:** 2026-03-07
- **Description:** The order auto-cancel job failed with error: `The column 'orders.cash_closure_id' does not exist in the current database.`
- **Root Cause:** The database schema had been updated to include `cashClosureId` in the Order model, but the migration had not been applied in production (Railway).

- **Solution:**

  1. Applied the migration in production: `npx prisma migrate deploy`
  2. Also fixed the job to use the extended Prisma client instead of creating a new one (for proper tenant filtering)

- **Files Changed:**

  - `src/jobs/order-auto-cancel.job.ts`

- **Note:** This is a deployment issue, not a code bug. Ensure migrations are run during deployment.
