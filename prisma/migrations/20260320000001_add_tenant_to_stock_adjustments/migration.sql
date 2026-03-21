-- AlterTable
ALTER TABLE "stock_adjustments" ADD COLUMN "restaurant_id" TEXT;

-- CreateIndex
CREATE INDEX "stock_adjustments_restaurant_id_idx" ON "stock_adjustments"("restaurant_id");

-- AddForeignKey
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
