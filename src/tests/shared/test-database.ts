import { PrismaClient } from "@prisma/client";
import { config } from "../../config";

// Soft delete extensions (copied from main prisma.ts to avoid circular dependency)
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

// Función helper para crear soft delete handlers con tipos estrictos
const createSoftDeleteHandlers = (modelName: SoftDeleteModelName) => ({
  async delete({
    model: _model,
    operation: _operation,
    args,
    query,
  }: PrismaQueryParams) {
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

// Singleton test database client
let testDbClient: any = null;

/**
 * Gets or creates the test database client singleton
 * @returns PrismaClient instance configured for testing
 */
export function getTestDatabaseClient(): any {
  if (!testDbClient) {
    testDbClient = new PrismaClient({
      datasources: {
        db: {
          url: config.testDatabaseUrl,
        },
      },
      // Reduce logging noise during tests
      log: config.nodeEnv === "test" ? [] : ["warn", "error"],
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
  }
  return testDbClient;
}

/**
 * Connects to the test database
 * Call this in beforeAll hooks for integration tests
 */
export async function connectTestDatabase(): Promise<void> {
  const client = getTestDatabaseClient();
  await client.$connect();
}

/**
 * Disconnects from the test database
 * Call this in afterAll hooks to clean up connections
 */
export async function disconnectTestDatabase(): Promise<void> {
  if (testDbClient) {
    await testDbClient.$disconnect();
    testDbClient = null;
  }
}

/**
 * Resets the database client (useful for test isolation)
 */
export function resetTestDatabaseClient(): void {
  testDbClient = null;
}
