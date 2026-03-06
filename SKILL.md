# Plaet Server Skill

## Description

Specialized instructions for working with the Plaet backend API (Node.js + Express + Prisma).

## Commands

### Essential Commands

```bash
cd server
npm run dev          # Start development server
npm run build        # TypeScript compilation
npm run test         # Run all tests
npm run test:watch   # Watch mode
npm run lint         # ESLint check
npm run prettier     # Format code
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run migrations
```

### Test Commands

```bash
npm run test -- src/api/users/user.service.test.ts  # Single test file
npm run test:integration  # Integration tests
```

## Architecture

### Layered Modular Pattern

```
src/api/{module}/
├── interfaces/           # Type contracts
├── {module}.controller.ts   # Route handlers
├── {module}.service.ts       # Business logic
├── {module}.repository.ts    # Data access
├── {module}.validator.ts     # Zod schemas
├── {module}.route.ts         # Express routes
└── __tests__/               # Tests
```

### Request Flow

```
HTTP Request → Middleware → Controller → Service → Repository → Database
```

## Multi-Tenant Architecture

### Automatic Tenant Isolation

- Prisma Client extended with tenant filter
- Models: User, MenuCategory, MenuItem, Table, Order, Expense, etc.
- `restaurantId` extracted from JWT token
- **NEVER manually filter by restaurantId** in repositories

## Authentication & Authorization

### JWT Flow

1. User logs in → receives access token
2. Access token contains: userId, restaurantId, roles, permissions
3. Middleware validates token and populates `req.user`

### RBAC Pattern

```typescript
router.patch(
  "/:id",
  permissionMiddleware("users:update"),
  controller.updateUser,
);
```

## Database (Prisma)

### Multi-Tenant Models

Models with tenant isolation: User, MenuCategory, MenuItem, Table, Order, Expense, CashClosure, DailyMenu, Customer, Inventory, PurchaseOrder

### Soft Delete

- Models: Permission, Role, MenuCategory, MenuItem, User, Table, Expense, Order

## Validation (Zod)

### Validator Pattern

```typescript
export const createItemSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100),
    price: z.number().positive(),
  }),
});

export type CreateItemInput = z.infer<typeof createItemSchema>["body"];
```

## Error Handling

### Custom Error Class

```typescript
throw new CustomError("Error message", HttpStatus.BAD_REQUEST, "ERROR_CODE");
```

## Logging

### Use Winston

```typescript
import { logger } from "../config/logger";

logger.info("User created", { userId });
```

- NEVER use console.log()

## Best Practices

1. **Always use TypeScript** - no `any` or `unknown`
2. **Define interfaces** for services and repositories
3. **Use Zod** for all validation
4. **Centralize errors** - throw CustomError
5. **Log with Winston** - never console.log
6. **Write tests** for services and critical paths
