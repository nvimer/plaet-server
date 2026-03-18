-- Rename Token table to tokens to match schema.prisma and project naming conventions
ALTER TABLE "Token" RENAME TO "tokens";

-- Rename Primary Key constraint
ALTER TABLE "tokens" RENAME CONSTRAINT "Token_pkey" TO "tokens_pkey";

-- Rename Foreign Key constraint to match standard
ALTER TABLE "tokens" RENAME CONSTRAINT "Token_userId_fkey" TO "tokens_userId_fkey";

-- Fix StockAdjustment field naming mismatch (camelCase in migration, snake_case in schema)
ALTER TABLE "stock_adjustments" RENAME COLUMN "adjustmentType" TO "adjustment_type";
