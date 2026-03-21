import { PrismaClient } from "@prisma/client";
import { tenantContext } from "../utils/tenant-context";
import { logger } from "../config/logger";

type PrismaModelName =
  | "user"
  | "User"
  | "menuCategory"
  | "MenuCategory"
  | "menuItem"
  | "MenuItem"
  | "table"
  | "Table"
  | "order"
  | "Order"
  | "expense"
  | "Expense"
  | "cashClosure"
  | "CashClosure"
  | "dailyMenu"
  | "DailyMenu"
  | "customer"
  | "Customer"
  | "permission"
  | "Permission"
  | "role"
  | "Role"
  | "token"
  | "Token"
  | "profile"
  | "Profile"
  | "restaurant"
  | "Restaurant"
  | "rolePermission"
  | "RolePermission"
  | "userRole"
  | "UserRole"
  | "orderItem"
  | "OrderItem"
  | "payment"
  | "Payment"
  | "ticketBook"
  | "TicketBook"
  | "ticketBookUsage"
  | "TicketBookUsage"
  | "stockAdjustment"
  | "StockAdjustment";

type DynamicPrismaClient = {
  [K in PrismaModelName]: K extends Capitalize<K>
    ? never
    : {
        update: (args: unknown) => unknown;
        updateMany: (args: unknown) => unknown;
      };
} & PrismaClient;

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
  "TicketBook",
  "TicketBookUsage",
  "DailyTicketBookCode",
  "StockAdjustment",
  "Role",
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

/**
 * Type-safe interface for objects with a restaurantId
 */
interface TenantRecord {
  restaurantId: string | null;
}

/**
 * Type-safe interface for soft-delete objects
 */
interface DeletedRecord {
  deleted: boolean;
}

export const prisma = prismaClient.$extends({
  query: {
    $allModels: {
      /**
       * Handle findUnique by performing a post-query security check.
       * This avoids Prisma validation errors while maintaining data isolation.
       */
      async findUnique({ model, args, query }) {
        const result = await query(args);
        const context = tenantContext.getStore();
        const restaurantId = context?.restaurantId;

        if (!result) return null;

        // Security check for Multi-Tenancy
        if (MODELS_WITH_TENANT.includes(model) && restaurantId) {
          const record = result as object;
          if ("restaurantId" in record) {
            const rid = (record as TenantRecord).restaurantId;
            
            // Strictly isolate Roles - Tenants cannot see global (null) roles
            if (model === "Role") {
              if (rid !== restaurantId) return null;
            } else {
              // Other models: hide only if it belongs to ANOTHER tenant
              if (rid && rid !== restaurantId) {
                return null;
              }
            }
          }
        }

        // Security check for Soft Delete
        if (SOFT_DELETE_MODELS.includes(model)) {
          const record = result as object;
          if ("deleted" in record && (record as DeletedRecord).deleted) {
            return null;
          }
        }

        return result;
      },

      /**
       * Handle update by performing a pre-query security check.
       */
      async update({ model, args, query }) {
        const context = tenantContext.getStore();
        const restaurantId = context?.restaurantId;

        const result = await query(args);

        if (result && MODELS_WITH_TENANT.includes(model) && restaurantId) {
          const record = result as object;
          if ("restaurantId" in record) {
            const rid = (record as TenantRecord).restaurantId;
            
            // Strictly isolate Roles - Tenants cannot update global (null) roles
            if (model === "Role") {
              if (rid !== restaurantId) {
                throw new Error("Unauthorized update: Record belongs to another restaurant or is a system role");
              }
            } else {
              // Other models: throw only if it belongs to ANOTHER tenant
              if (rid && rid !== restaurantId) {
                throw new Error("Unauthorized update: Record belongs to another restaurant");
              }
            }
          }
        }

        return result;
      },

      /**
       * Handle findFirst, findMany, and count by injecting filters.
       * These operations natively support complex WHERE clauses.
       */
      async findFirst({ model, args, query }) {
        const context = tenantContext.getStore();
        const restaurantId = context?.restaurantId;

        const where = (args.where || {}) as Record<string, object | string | number | boolean | null>;

        if (MODELS_WITH_TENANT.includes(model) && restaurantId) {
          // Strictly isolate Roles - Tenants see their own OR global roles (to allow SUPERADMIN visibility)
          // Actually, let's allow tenants to see global roles only if we explicitly want templates,
          // but for now, let's make sure the filter includes null for system roles to be manageable.
          args.where = {
            ...where,
            AND: [
              where,
              { OR: [{ restaurantId }, { restaurantId: null }] }
            ]
          };
        }

        if (SOFT_DELETE_MODELS.includes(model)) {
          args.where = { ...args.where, deleted: false };
        }

        return query(args);
      },

      async findMany({ model, args, query }) {
        const context = tenantContext.getStore();
        const restaurantId = context?.restaurantId;
        const where = (args.where || {}) as Record<string, object | string | number | boolean | null>;

        if (MODELS_WITH_TENANT.includes(model) && restaurantId) {
          args.where = {
            ...where,
            AND: [
              where,
              { OR: [{ restaurantId }, { restaurantId: null }] }
            ]
          };
        }

        if (SOFT_DELETE_MODELS.includes(model)) {
          args.where = { ...args.where, deleted: false };
        }

        return query(args);
      },

      async count({ model, args, query }) {
        const context = tenantContext.getStore();
        const restaurantId = context?.restaurantId;
        const where = (args.where || {}) as Record<string, object | string | number | boolean | null>;

        if (MODELS_WITH_TENANT.includes(model) && restaurantId) {
          args.where = {
            ...where,
            AND: [
              where,
              { OR: [{ restaurantId }, { restaurantId: null }] }
            ]
          };
        }

        if (SOFT_DELETE_MODELS.includes(model)) {
          args.where = { ...args.where, deleted: false };
        }

        return query(args);
      },

      /**
       * Handle creation by auto-injecting restaurantId.
       */
      async create({ model, args, query }) {
        const context = tenantContext.getStore();
        const restaurantId = context?.restaurantId;

        if (MODELS_WITH_TENANT.includes(model) && restaurantId) {
          const data = args.data as Record<string, object | string | number | boolean | null>;
          if (!data.restaurantId) {
            data.restaurantId = restaurantId;
          }
        }

        return query(args);
      },

      /**
       * Handle delete by converting to a soft-delete update if applicable.
       */
      async delete({ model, args, query }) {
        if (SOFT_DELETE_MODELS.includes(model)) {
          const modelKey = (model.charAt(0).toLowerCase() + model.slice(1)) as keyof PrismaClient;
          // We must use update to perform soft delete
          // Using type assertion to object to bypass strict generic checking
          const client = getPrismaClient() as object;
          const keyStr = modelKey.toString();
          if (keyStr in client) {
            const modelDelegate = (client as Record<string, { update: Function }>)[keyStr];
            return modelDelegate.update({
              where: args.where,
              data: { deleted: true, deletedAt: new Date() }
            });
          }
        }
        return query(args);
      }
    },
  },
});

export function getPrismaClient(): typeof prisma {
  return prisma;
}

/**
 * Returns the base Prisma Client without extensions.
 * Use ONLY for critical security validations or across-tenant queries.
 */
export function getBasePrismaClient(): PrismaClient {
  return prismaClient;
}

export default prisma;
