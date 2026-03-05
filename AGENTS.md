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
*   **Standardize UI:** `npm run fix:ui` (Must be run after creating/modifying UI components)

### Server Commands (`/server` directory)
*   **Install:** `npm install`
*   **Dev Server:** `npm run dev`
*   **Build:** `npm run build`
*   **Lint:** `npm run eslint-check-only` (or `npm run eslint-fix`)
*   **Format:** `npm run prettier`
*   **Prisma:** `npm run prisma:generate`, `npm run prisma:migrate`

### 🧪 Running Tests (Server Only)
The server uses **Jest**. Always ensure tests pass before declaring a task complete.
*   **Run all tests:** `npm run test`
*   **Run tests in watch mode:** `npm run test:watch`
*   **Run test coverage:** `npm run test:coverage`
*   **Run Integration/E2E:** `npm run test:integration` / `npm run test:e2e`
*   **🎯 RUN A SINGLE TEST:** `npx jest src/path/to/your.test.ts` or `npm run test -- src/path/to/your.test.ts`
*   *Note: Client currently lacks a standard test suite; focus on `type-check` and `lint` for the frontend.*

---

## 🏗️ 2. Architectural Conventions

### Multi-Tenant Architecture (Crucial)
*   **Server:** Prisma Client extensions automatically filter queries by `restaurantId`. NEVER manually filter by `restaurantId` in repositories unless building a global analytics module for `SUPERADMIN`. The `restaurantId` is extracted from the JWT.
*   **Client:** `restaurantId` is managed in the Auth Context. Trust the backend for data isolation. Do not filter data by `restaurantId` on the frontend manually.

### Directory Structure
*   **Client:** Uses a Feature-Based structure (`src/features/{name}/`).
    *   `components/`: Module-specific tactical components.
    *   `hooks/`: TanStack Query hooks.
    *   `pages/`: Routed components (Hierarchical: Home > Hub > Page).
    *   `schemas/`: Zod validation schemas.
    *   `services/`: Axios API call functions.
    *   `index.ts`: Module barrel export.
    *   Shared UI goes in `src/components/ui/`, `src/components/guards/`, etc.
*   **Server:** Uses a Layered Modular pattern (`src/api/{module}/`).
    *   **Route -> Controller -> Service -> Repository**.
    *   Interfaces must define contracts for Services and Repositories.
    *   Services house business logic; Repositories handle Prisma DB interactions.

---

## 🎨 3. Code Style & Guidelines

### Types & TypeScript
*   **ZERO TOLERANCE for `any` or `unknown`.** Always define explicit types or interfaces.
*   Use `import type` for interfaces and type definitions.
*   **Server:** Cast the request user using the `AuthenticatedUser` interface (`req.user as AuthenticatedUser`).

### Error Handling & Validation
*   **Validation:** Use **Zod** for all data validation across both environments. 
    *   *Client:* Always use `react-hook-form` combined with `@hookform/resolvers/zod`.
    *   *Server:* Every request (body, query, params) must be validated at the route level via Zod middleware.
*   **Server Errors:** Use the custom `CustomError` class for expected failures (400, 403, 404). Centralized error middleware will catch these and format the response. Do not send raw `res.status(500).json()` from services.

### Logging
*   **NO RAW `console.log()`.**
*   **Client:** Use the professional `logger.ts` utility.
*   **Server:** Use the centralized Winston/Morgan `logger`.

### Access Control (RBAC)
*   **Client:** Use the `usePermissions().hasPermission("module:action")` hook for O(1) permission checks. Prefer declarative UI: `<Guard permission="name">...</Guard>`.
*   **Server:** Protect routes using `permissionMiddleware("module:action")`. Ensure critical business logic in Services also verifies ownership. `SUPERADMIN` role bypasses tenant/permission checks.

### Frontend UI & Styling (Client)
*   **Tailwind Semantic Tokens:** Never use literal colors (e.g., `red-500`, `text-gray-800`). Use predefined semantic tokens from `tailwind.config.js`:
    *   Backgrounds/accents: `sage`
    *   Text/dark elements: `carbon`
    *   Feedback: `success`, `warning`, `error`, `info`.
*   **Geometry:** Use `rounded-2xl` for standard cards, `rounded-3xl` for Launchpads/Module Hubs.
*   **Motion:** Use `transitions.soft` (Cubic Bezier: `[0.22, 1, 0.36, 1]`) and `variants.fadeInUp` for page transitions via `framer-motion`.
*   **Timezones:** Use `dateUtils` for date calculations to ensure consistency with UTC-5 (Colombia time).

### Backend Performance (Server)
*   **O(N^2) Prevention:** Prioritize O(1) or O(log N) lookups. Avoid nested loops.
*   **N+1 Queries:** Always use Prisma's `include` or `select` to fetch related data in a single query.
*   **Pagination:** All list endpoints MUST support pagination via `PaginationParams` and return a `PaginatedResponse`.

---

## 📝 4. General Working Process for Agents
1. **Analyze Context:** Read `package.json` in `/client` or `/server` to understand available libraries.
2. **Search First:** Use tools like `glob` and `grep` to find existing implementations of patterns (e.g., how other routes or components are built) before writing new code.
3. **Build & Verify:** Always run the appropriate type-checker (`npm run type-check` or `npm run build`) and linter after modifying code.
4. **Test:** For the server, write unit tests for your Services (mocking repositories) and integration tests for APIs. Run single tests using `npx jest <file>` to verify functionality iteratively.

---

## 🐛 5. Troubleshooting Vault (Errors & Solutions)
Every time a significant error, bug, or complex issue is resolved, agents MUST document it in the respective directory's troubleshooting vault. This maintains a shared knowledge base of past failures and their solutions.

Instead of a single file, each error MUST be stored in its own separate Markdown file inside a dedicated directory.

*   **Client Vault Directory:** `/client/troubleshooting/`
*   **Server Vault Directory:** `/server/troubleshooting/`

**File Naming Convention:**
Use an OS timestamp (Unix epoch time) as a unique ID prefix, followed by a brief kebab-case description (the title) for the filename: `[timestamp]-[short-error-title].md` (e.g., `1709664532-prisma-connection-pool.md`).

**Format for Individual Vault Files:**
```markdown
# [Error Title or Code]

*   **ID:** [timestamp]
*   **Date:** YYYY-MM-DD
*   **Description:** Briefly explain what happened and under what circumstances (e.g. error message, unexpected behavior).
*   **Root Cause:** Why did this error occur? What was the underlying technical failure?
*   **Solution:** Step-by-step on how it was fixed, including relevant code snippets, changes made, or commands run.
```

---

## 🌿 6. Git Workflow & Version Control
Agents must follow a strict, professional Git workflow to maintain a clean and understandable history.

*   **Specialized Branches:** Never commit directly to the `main` or `master` branch. Always create isolated branches for specific tasks before writing code:
    *   `feature/name-of-feature` (For new additions)
    *   `bugfix/name-of-bug` (For fixing issues)
    *   `refactor/name-of-refactor` (For structural code changes)
*   **Atomic Commits:** Commits must be small, focused, and contain only ONE logical change. Do not bundle unrelated modifications (e.g., do not mix a UI fix with a database migration).
*   **Descriptive Commit Messages:** Use the Conventional Commits standard:
    *   `feat(client): add dark mode toggle`
    *   `fix(server): resolve N+1 query in orders repo`
    *   `docs: update troubleshooting vault`
*   **Tags:** Use semantic versioning tags (e.g., `v1.2.0`) to mark significant milestones, deployments, or releases when instructed to do so.

---

## 🔄 7. Continuous Learning & Auto-Updating
As an AI agent, you are part of a continuous feedback loop. You must actively maintain and evolve this knowledge base based on daily learnings.

*   **Living Document:** If you discover a new architectural pattern, a more efficient way to structure code, or a change in standard commands/dependencies, you MUST proactively update this `AGENTS.md` file to reflect the new reality.
*   **Proactive Vault Updates:** If you notice a recurring issue, a new edge case, or learn a new optimization, do not wait to be asked. Document it proactively in the Troubleshooting Vault or add a new guideline here.
*   **Self-Feeding Loop:** Treat your daily interactions, bugs solved, and code written as feedback. If a previous instruction in this file is outdated, redundant, or causing friction, revise it to improve future agentic workflows.
