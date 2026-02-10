-- CreateEnum
CREATE TYPE "StockAdjustmentType" AS ENUM ('DAILY_RESET', 'MANUAL_ADD', 'MANUAL_REMOVE', 'ORDER_DEDUCT', 'ORDER_CANCELLED', 'AUTO_BLOCKED');

-- AlterTable
ALTER TABLE "stock_adjustments" 
ADD COLUMN "adjustment_type" "StockAdjustmentType" NOT NULL DEFAULT 'MANUAL_ADD';

-- Update existing data to convert string values to enum
UPDATE "stock_adjustments" 
SET "adjustment_type" = CASE 
    WHEN "adjustmentType" = 'DAILY_RESET' THEN 'DAILY_RESET'::"StockAdjustmentType"
    WHEN "adjustmentType" = 'MANUAL_ADD' THEN 'MANUAL_ADD'::"StockAdjustmentType"
    WHEN "adjustmentType" = 'MANUAL_REMOVE' THEN 'MANUAL_REMOVE'::"StockAdjustmentType"
    WHEN "adjustmentType" = 'ORDER_DEDUCT' THEN 'ORDER_DEDUCT'::"StockAdjustmentType"
    WHEN "adjustmentType" = 'ORDER_CANCELLED' THEN 'ORDER_CANCELLED'::"StockAdjustmentType"
    WHEN "adjustmentType" = 'AUTO_BLOCKED' THEN 'AUTO_BLOCKED'::"StockAdjustmentType"
    ELSE 'MANUAL_ADD'::"StockAdjustmentType"
END;

-- Drop the old column
ALTER TABLE "stock_adjustments" DROP COLUMN "adjustmentType";