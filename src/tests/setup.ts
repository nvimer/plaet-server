/**
 * Global Jest Setup for Integration/E2E Tests
 *
 * This file is automatically loaded by Jest before running tests.
 * It handles database connection, cleanup, and global configuration.
 *
 * For unit tests: No database setup needed, mocks are used instead.
 * For integration/e2e tests: Database is connected and cleaned.
 */
import {
  connectTestDatabase,
  disconnectTestDatabase,
  getTestDatabaseClient,
} from "./shared/test-database";
import { cleanupAllTestData } from "./shared/cleanup";
import { logger } from "../config/logger";
import { config } from "../config";

// Increase timeout for database operations
jest.setTimeout(30000);

/**
 * Global setup - runs once before all tests
 */
beforeAll(async () => {
  // Only connect to database for integration/e2e tests
  if (
    process.env.TEST_TYPE === "integration" ||
    process.env.TEST_TYPE === "e2e"
  ) {
    try {
      await connectTestDatabase();
      logger.info("✅ Test database connected");
    } catch (error) {
      logger.error("❌ Failed to connect test database:", error);
      throw error;
    }
  }
});

/**
 * Global teardown - runs once after all tests
 */
afterAll(async () => {
  if (
    process.env.TEST_TYPE === "integration" ||
    process.env.TEST_TYPE === "e2e"
  ) {
    try {
      await disconnectTestDatabase();
      logger.info("✅ Test database disconnected");
    } catch (error) {
      logger.error("❌ Error disconnecting test database:", error);
    }
  }
});

/**
 * Cleanup before each test
 * Only runs for integration/e2e tests to ensure clean state
 */
beforeEach(async () => {
  if (
    process.env.TEST_TYPE === "integration" ||
    process.env.TEST_TYPE === "e2e"
  ) {
    try {
      await cleanupAllTestData();
    } catch (error) {
      logger.error("❌ Error cleaning test data:", error);
    }
  }
});

// Re-export for backward compatibility
export { getTestDatabaseClient as testDatabaseClient };
