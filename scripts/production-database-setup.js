#!/usr/bin/env node

/**
 * Production Database Setup for Plaet API
 * This script prepares the database for production deployment on Railway
 */

const { PrismaClient } = require("@prisma/client");
const { config } = require("../src/config");

async function setupProductionDatabase() {
  console.log("🗄️ Setting up production database...");

  try {
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: config.databaseUrl,
        },
      },
      log: ["info", "warn", "error"],
    });

    // Test database connection
    await prisma.$connect();
    console.log("✅ Database connection successful");

    // Run migrations
    console.log("🔄 Running database migrations...");
    const { execSync } = require("child_process");

    try {
      execSync("npx prisma migrate deploy", { stdio: "inherit" });
      console.log("✅ Database migrations completed");
    } catch (error) {
      console.error("❌ Migration failed:", error.message);
      process.exit(1);
    }

    // Seed initial data if needed
    console.log("🌱 Seeding initial data...");
    try {
      execSync("npx prisma db seed", { stdio: "inherit" });
      console.log("✅ Database seeding completed");
    } catch (error) {
      console.warn(
        "⚠️  Database seeding failed (may be already seeded):",
        error.message,
      );
    }

    await prisma.$disconnect();
    console.log("✅ Production database setup completed");
  } catch (error) {
    console.error("❌ Database setup failed:", error.message);
    process.exit(1);
  }
}

// Run setup if this file is executed directly
if (require.main === module) {
  setupProductionDatabase();
}

module.exports = { setupProductionDatabase };
