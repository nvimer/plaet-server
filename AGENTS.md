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
