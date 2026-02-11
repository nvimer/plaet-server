/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient } from "@prisma/client";
import { logger } from "../config/logger";

interface SoftDeleteWhere {
  deleted: boolean;
  [key: string]: unknown;
}

interface SoftDeleteData {
  deleted: boolean;
  deletedAt: Date;
  [key: string]: unknown;
}

interface SoftDeleteArgs {
  where?: Record<string, unknown> & { id?: unknown };
  data?: Record<string, unknown>;
}

interface PrismaQueryParams<TArgs = SoftDeleteArgs> {
  model: string;
  operation: string;
  args: TArgs;
  query: (args: TArgs) => Promise<unknown>;
}

const _SOFT_DELETE_MODELS = [
  "Permission",
  "Role",
  "MenuCategory",
  "MenuItem",
  "User",
  "Table",
] as const;

type SoftDeleteModelName = (typeof _SOFT_DELETE_MODELS)[number];

// Helper function to create soft delete handlers with strict types
const createSoftDeleteHandlers = (modelName: SoftDeleteModelName) => ({
  async delete({
    model: _model,
    operation: _operation,
    args,
    query,
  }: PrismaQueryParams) {
    logger.info(`Soft deleting ${modelName} with ID: ${args.where?.id}`);
    return query({
      ...args,
      data: {
        ...args.data,
        deleted: true,
        deletedAt: new Date(),
      } as SoftDeleteData,
    });
  },

  async deleteMany({
    model: _model,
    operation: _operation,
    args,
    query,
  }: PrismaQueryParams) {
    logger.info(`Soft deleting multiple ${modelName}s`);
    return query({
      ...args,
      data: {
        ...args.data,
        deleted: true,
        deletedAt: new Date(),
      } as SoftDeleteData,
    });
  },

  async findMany({
    model: _model,
    operation: _operation,
    args,
    query,
  }: PrismaQueryParams) {
    const where = args.where || {};
    return query({
      ...args,
      where: { ...where, deleted: false } as SoftDeleteWhere,
    });
  },

  async findFirst({
    model: _model,
    operation: _operation,
    args,
    query,
  }: PrismaQueryParams) {
    const where = args.where || {};
    return query({
      ...args,
      where: { ...where, deleted: false } as SoftDeleteWhere,
    });
  },

  async findUnique({
    model: _model,
    operation: _operation,
    args,
    query,
  }: PrismaQueryParams) {
    const where = args.where || {};
    return query({
      ...args,
      where: { ...where, deleted: false } as SoftDeleteWhere,
    });
  },
});

// Crear PrismaClient con extensiones para soft delete
const prisma = new PrismaClient({
  log: ["query", "info", "warn", "error"],
}).$extends({
  query: {
    // MenuCategory soft delete
    menuCategory: createSoftDeleteHandlers("MenuCategory"),
    // MenuItem soft delete
    menuItem: createSoftDeleteHandlers("MenuItem"),
    // Permission soft delete
    permission: createSoftDeleteHandlers("Permission"),
    // Role soft delete
    role: createSoftDeleteHandlers("Role"),
    // User soft delete
    user: createSoftDeleteHandlers("User"),
    // Table soft delete
    table: createSoftDeleteHandlers("Table"),
  },
});

// Hook for clean disconnect to close application
process.on("beforeExit", async () => {
  await prisma.$disconnect();
});

/**
 * Gets the appropriate Prisma client based on the environment.
 *
 * In test environment with TEST_TYPE set (integration/E2E tests),
 * returns the test database client. Otherwise, returns the main
 * production client with soft delete extensions.
 *
 * This function is used by services to ensure they access the
 * correct database when running integration/E2E tests.
 *
 * @returns Prisma client instance (test or production)
 */
export function getPrismaClient(): any {
  if (process.env.NODE_ENV === "test") {
    // For all tests (unit, integration, E2E), use test database client
    // Dynamic import to avoid circular dependencies
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const testDbModule = require("../tests/shared/test-database") as {
      getTestDatabaseClient: () => any;
    };
    return testDbModule.getTestDatabaseClient();
  }
  return prisma;
}

export default prisma;
