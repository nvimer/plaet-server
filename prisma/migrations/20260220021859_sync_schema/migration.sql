/*
  Warnings:

  - You are about to drop the column `premium_protein_price` on the `daily_menus` table. All the data in the column will be lost.
  - You are about to drop the column `protein_option_1_id` on the `daily_menus` table. All the data in the column will be lost.
  - You are about to drop the column `protein_option_2_id` on the `daily_menus` table. All the data in the column will be lost.
  - You are about to drop the column `protein_option_3_id` on the `daily_menus` table. All the data in the column will be lost.
  - You are about to drop the column `initial_stock` on the `menu_items` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "daily_menus" DROP COLUMN "premium_protein_price",
DROP COLUMN "protein_option_1_id",
DROP COLUMN "protein_option_2_id",
DROP COLUMN "protein_option_3_id",
ADD COLUMN     "dessert_category_id" INTEGER,
ADD COLUMN     "dessert_option_1_id" INTEGER,
ADD COLUMN     "dessert_option_2_id" INTEGER,
ADD COLUMN     "protein_ids" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "salad_category_id" INTEGER,
ADD COLUMN     "salad_option_1_id" INTEGER,
ADD COLUMN     "salad_option_2_id" INTEGER,
ALTER COLUMN "base_price" SET DEFAULT 4000.00;

-- AlterTable
ALTER TABLE "menu_items" DROP COLUMN "initial_stock";

-- AlterTable
ALTER TABLE "stock_adjustments" ALTER COLUMN "adjustment_type" DROP DEFAULT;
