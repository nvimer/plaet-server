import { PrismaClient } from "@prisma/client";
import { tenantContext } from "../utils/tenant-context";

const MODELS_WITH_TENANT = [
  "User",
  "MenuCategory",
  "MenuItem",
  "Table",
  "Order",
  "Expense",
  "CashClosure",
  "DailyMenu",
  "Customer",
  "Inventory",
  "PurchaseOrder",
];

const SOFT_DELETE_MODELS = [
  "Permission",
  "Role",
  "MenuCategory",
  "MenuItem",
  "User",
  "Table",
  "Expense",
  "Order",
];

const prismaClient = new PrismaClient({
  log: ["info", "warn", "error"],
});

export const prisma = prismaClient.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const context = tenantContext.getStore();
        const restaurantId = context?.restaurantId;

        interface ExtendedArgs {
          where?: Record<string, any>;
          data?: Record<string, any>;
          [key: string]: any;
        }

        const extendedArgs = args as ExtendedArgs;

        // 1. Inyectar restaurantId en filtros (READ/UPDATE/DELETE)
        if (MODELS_WITH_TENANT.includes(model)) {
          if (restaurantId && operation !== "create") {
            extendedArgs.where = { ...extendedArgs.where, restaurantId };
          }
        }

        // 2. Inyectar restaurantId en creaciones (CREATE)
        if (MODELS_WITH_TENANT.includes(model) && operation === "create") {
          if (
            restaurantId &&
            extendedArgs.data &&
            !extendedArgs.data.restaurantId
          ) {
            extendedArgs.data = { ...extendedArgs.data, restaurantId };
          }
        }

        // 3. Inyectar Soft Delete
        if (SOFT_DELETE_MODELS.includes(model)) {
          if (
            ["findMany", "findFirst", "findUnique", "count"].includes(operation)
          ) {
            extendedArgs.where = { ...extendedArgs.where, deleted: false };
          }

          if (operation === "delete") {
            return (prismaClient @typescript-eslint/no-explicit-any
    as any)[model.toLowerCase()].update({
              where: extendedArgs.where,
              data: { deleted: true, deletedAt: new Date() },
            });
          }

          if (operation === "deleteMany") {
            return (prismaClient @typescript-eslint/no-explicit-any
    as any)[model.toLowerCase()].updateMany({
              where: extendedArgs.where,
              data: { deleted: true, deletedAt: new Date() },
            });
          }
        }

        return query(extendedArgs);
      },
    },
  },
});

export function getPrismaClient(): any {
  return prisma;
}

export default prisma;
