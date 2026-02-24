# AGENTS.md - Coding Guidelines & Context for AI Agents

Welcome, fellow AI Agent! This document contains all the necessary context, rules, and architectural decisions for the Plaet API project.

## 🏢 Architecture: Multi-Tenant SaaS

The project is built as a **Multi-tenant SaaS** using a shared database with column-based isolation.

### 1. Data Isolation (Prisma Extension)
- **Global Extension:** A global Prisma extension in `src/database/prisma.ts` intercepts all operations.
- **Automatic Filtering:** It automatically injects `where: { restaurantId: currentId }` into READ, UPDATE, and DELETE operations for tenant-specific models.
- **Automatic Assignment:** It automatically injects `restaurantId` into CREATE operations.
- **Tenant Context:** Uses `AsyncLocalStorage` (`src/utils/tenant-context.ts`) to store the `restaurantId` during the request lifecycle, populated by `tenantMiddleware`.

### 2. Authentication & Identity
- **JWT Payload:** Tokens include `restaurantId`. Decoded payload is available in `req.user.restaurantId` after `authJwt` middleware.
- **SUPERADMIN:** This role has no `restaurantId` and bypasses tenant isolation filters to manage the entire system.

## 🚀 Performance & Complexity (Crucial)

All code contributions MUST prioritize algorithmic efficiency.
- **Goal:** Target **O(1)** or **O(log N)** for lookups and logic.
- **Avoid:** Strictly avoid **O(N^2)** (nested loops) or **Exponential** complexities.
- **Database:** Ensure queries leverage composite indices (e.g., `@@index([restaurantId, createdAt])`). 
- **Data Structures:** Prefer `Map` and `Set` over Array searches for constant time lookups.

## 🍽 Project Domain: Plaet API (Restaurant Management)

Handles users, customers, tables, orders, menus, and inventory for multiple restaurants.

### Core Domain: The "Corrientazo" (Daily Menu)
- **Pricing:** `basePrice` + `protein price`.
- **Structure:** `DailyMenu` references `MenuItem` IDs and `MenuCategory` IDs.
- **Historical Data:** Support for creating and editing menus for past dates is mandatory.

## 🏗️ Project Architecture & Structure

Layered architecture: **Controller -> Service -> Repository**.

```text
src/
├── api/                     # Feature modules
├── config/                  # Global configuration
├── database/                # Prisma client & extensions
├── middlewares/             # Tenant, Auth, Errors
├── types/                   # TypeScript definitions
└── utils/                   # Tenant context, Helpers
```

## 🛠️ Quality Standards

### 1. Strict Typing
- **NO `any` or `unknown`** types allowed.
- Use `eslint-disable-next-line` only for Prisma internal types if absolutely necessary.

### 2. Date Handling
- **Robust Parsing:** Use `new Date(dateString + "T12:00:00.000Z")` for YYYY-MM-DD strings to avoid timezone-driven off-by-one day bugs.

### 3. Strings & Formatting
- Use **double quotes** (""). Semicolons are **required**.

## 🛠️ Build/Lint Commands

```bash
npm run dev              # Nodemon + ts-node
npm run build            # Compilation
npm run eslint-check-only # Linting
npm test                 # Jest tests
```
