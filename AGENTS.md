# 🤖 Agentic Coding Guidelines (Plaet App)

Welcome! You are an AI agent operating in the **Plaet** monorepo, a SaaS application for restaurant management. This project is split into two primary environments: `/client` (React 19 + Vite) and `/server` (Node.js + Express + Prisma).

Please read and adhere strictly to these guidelines when analyzing, modifying, or creating code in this repository.

---

## 🛠️ 1. Build, Lint, and Test Commands

Always run commands from their respective directories (`/client` or `/server`), NOT the root.

### Client Commands (`/client` directory)
*   **Install:** `npm install`
*   **Dev Server:** `npm run dev`
*   **Build:** `npm run build`
*   **Lint:** `npm run lint`
*   **Type-Check:** `npm run type-check` (Run this after major changes to catch TS errors)
*   **Test:** `npm run test` (Vitest)
*   **Standardize UI:** `npm run fix:ui` (Must be run after creating/modifying UI components)

### Server Commands (`/server` directory)
*   **Install:** `npm install`
*   **Dev Server:** `npm run dev`
*   **Build:** `npm run build`
*   **Lint:** `npm run eslint-check-only` (or `npm run eslint-fix`)
*   **Format:** `npm run prettier`
*   **Prisma:** `npm run prisma:generate`, `npm run prisma:migrate`

### 🧪 Running Tests
*   **Server (Jest):** Always ensure tests pass before declaring a task complete.
    *   `npm run test`, `npm run test:integration`, `npm run test:e2e`.
*   **Client (Vitest):** Use Vitest for business logic and hook testing.
    *   `npm run test`.

---

## 🏗️ 2. Architectural Conventions

### Multi-Tenant Architecture (Crucial)
*   **Server:** Prisma Client extensions automatically filter queries by `restaurantId`. NEVER manually filter by `restaurantId` in repositories unless building a global analytics module for `SUPERADMIN`. The `restaurantId` is extracted from the JWT.
*   **Client:** Trust the backend for data isolation. Do not filter data by `restaurantId` on the frontend manually.

### Directory Structure
*   **Client:** Uses a Feature-Based structure (`src/features/{name}/`).
    *   `logic/`: Pure TypeScript logic (no React dependencies).
    *   `hooks/`: Specialized micro-hooks.
    *   `stores/`: Zustand stores for global/persistent state.
    *   `components/`: Following **Atomic Design** (`atoms`, `molecules`, `organisms`).
*   **Server:** Uses a Layered Modular pattern (`src/api/{module}/`).
    *   **Route -> Controller -> Service -> Repository**.
    *   Large services MUST be split into sub-services (e.g., `OrderCreationService`, `OrderStatusService`).

---

## 🎨 3. Code Style & Guidelines

### State Management (Client)
*   **Zustand FIRST:** Use Zustand for all global or persistent state. **React Context is deprecated** for state sharing due to performance issues.
*   **Persistence:** Use Zustand `persist` middleware for operational state (drafts, UI preferences).

### Efficiency & Algorithms
*   **O(N) Priority:** Avoid nested loops (O(N^2)) when processing lists (grouping, filtering). Use `Map` or `Set` for single-pass processing.
*   **Memoization:** Use `useMemo` and `useCallback` for expensive transformations or stable references.

### Types & TypeScript
*   **STRICT ZERO TOLERANCE for `any` or `unknown`.** Always define explicit types or interfaces.
*   Use `import type` for interfaces and type definitions.

### Error Handling & Validation
*   **Validation:** Use **Zod** everywhere.
*   **Server Errors:** Use `CustomError` class for expected failures.

### Logging
*   **NO RAW `console.log()`.**
*   **Client:** Use `@/utils/logger.ts`.
*   **Server:** Use centralized Winston `logger`.

### Email Service (Server)
*   **Provider:** We use **Resend** via HTTPS API.
*   **Library:** `resend` (Do NOT use `nodemailer` or `smtp` implementations).
*   **Template:** Use the `getEmailLayout` helper in `src/config/email.ts` for consistent, humanized styling.

### Access Control (RBAC)
*   **Client:** Use `usePermissions()` hook. Use declarative UI: `<Guard permission="name">...</Guard>`.
*   **Server:** Use `permissionMiddleware("module:action")`.

### Frontend UI & Styling (Client)
*   **Atomic Design:** 
    *   `atoms/`: Primitives (Button, Input).
    *   `molecules/`: Composite functional components (StatCard, Modals).
    *   `organisms/`: Complex UI blocks (OrderForm).
*   **Standardized Imports:** Always import components from the central `@/components` alias.

### Cash Closure & Historical Data (Critical)
*   **Date-Aware Validation:** When creating orders or payments, check if the date is historical.
*   **Today:** Requires an OPEN cash closure.
*   **Past:** Try to find a closure on that date; allow creation (associating or with null) if it's a historical entry. Never block historical data entry due to current closure status.

---

## 📝 4. General Working Process for Agents
1. **Analyze Context:** Read `package.json` and `AGENTS.md`.
2. **Modularize:** Split large files into atomic pieces. Extract pure logic from React components.
3. **Optimize:** Ensure algorithms are efficient (O(N)).
4. **Build & Verify:** Always run `type-check` and `lint`.

---

## 🐛 5. Troubleshooting Vault
Document significant errors in `/client/troubleshooting/` or `/server/troubleshooting/`.
Naming: `[timestamp]-[short-description].md`.

---

## 🌿 6. Git Workflow
Isolated branches: `feature/`, `bugfix/`, `refactor/`, `perf/`. Small, atomic commits. Conventional Commits standard.
