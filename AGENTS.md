# AGENTS.md - Coding Guidelines & Context for AI Agents (Server)

## 🏢 Architecture: Multi-Tenant SaaS

### 1. Data Isolation (Prisma Extension)
- **Automatic Filtering:** READ/UPDATE/DELETE are filtered by `restaurantId` automatically.
- **Automatic Assignment:** CREATE injects `restaurantId` automatically.
- **SUPERADMIN:** Bypasses all tenant filters to manage global SaaS data.

### 2. Granular Permissions System
- **Permission-Based Access:** Use `permissionMiddleware("module:action")` to protect routes.
- **Hierarchy:** Roles (`ADMIN`, `WAITER`, etc.) are collections of granular permissions (`orders:create`, `menu:read`).
- **SuperAdmin Bypass:** `SUPERADMIN` role bypasses all permission checks in `permissionMiddleware`.

## 🚀 Performance & Complexity
- **O(1) Priority:** Use `Map` and `Set` for heavy lookups.
- **Algorithmic Efficiency:** Avoid O(N^2) operations. Code must be scalable for thousands of tenants.

## 🛠️ Quality Standards
- **Zero Tolerance:** NO `any` or `unknown`. Use `AuthenticatedUser` for `req.user` casting.
- **Clean Code Documentation:** Comments must describe *functionality* and *complexity*. Never include change logs, commit-like messages, or conversational filler in code comments.
- **Strict Formatting:** Double quotes, semicolons required, 2 spaces indentation.

## 🏗️ Structure
- **Pattern:** Controller -> Service -> Repository.
- **Seeds:** Always update `permissions.seed.ts` and `roles.seed.ts` when adding new features.
