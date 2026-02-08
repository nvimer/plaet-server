/*
  Warnings:

  - You are about to drop the column `dessert` on the `daily_menus` table. All the data in the column will be lost.
  - You are about to drop the column `drink` on the `daily_menus` table. All the data in the column will be lost.
  - You are about to drop the column `side` on the `daily_menus` table. All the data in the column will be lost.
  - You are about to drop the column `soup` on the `daily_menus` table. All the data in the column will be lost.
  - You are about to drop the column `combo_price` on the `menu_items` table. All the data in the column will be lost.
  - You are about to drop the column `component_type` on the `menu_items` table. All the data in the column will be lost.
  - You are about to drop the column `is_extra` on the `menu_items` table. All the data in the column will be lost.
  - You are about to drop the column `is_plate_component` on the `menu_items` table. All the data in the column will be lost.
  - You are about to drop the column `is_premium` on the `menu_items` table. All the data in the column will be lost.
  - You are about to drop the column `is_protein` on the `menu_items` table. All the data in the column will be lost.
  - You are about to drop the column `protein_icon` on the `menu_items` table. All the data in the column will be lost.
  - You are about to drop the column `is_extra` on the `order_items` table. All the data in the column will be lost.
  - You are about to drop the column `is_free_substitution` on the `order_items` table. All the data in the column will be lost.
  - You are about to drop the column `is_substitution` on the `order_items` table. All the data in the column will be lost.
  - You are about to drop the column `original_item_id` on the `order_items` table. All the data in the column will be lost.
  - You are about to drop the `daily_menu_options` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."daily_menu_options" DROP CONSTRAINT "daily_menu_options_menu_item_id_fkey";

-- AlterTable
ALTER TABLE "daily_menus" DROP COLUMN "dessert",
DROP COLUMN "drink",
DROP COLUMN "side",
DROP COLUMN "soup",
ADD COLUMN     "base_price" DECIMAL(10,2) NOT NULL DEFAULT 10000.00,
ADD COLUMN     "drink_category_id" INTEGER,
ADD COLUMN     "drink_option_1_id" INTEGER,
ADD COLUMN     "drink_option_2_id" INTEGER,
ADD COLUMN     "extra_category_id" INTEGER,
ADD COLUMN     "extra_option_1_id" INTEGER,
ADD COLUMN     "extra_option_2_id" INTEGER,
ADD COLUMN     "premium_protein_price" DECIMAL(10,2) NOT NULL DEFAULT 11000.00,
ADD COLUMN     "principle_category_id" INTEGER,
ADD COLUMN     "principle_option_1_id" INTEGER,
ADD COLUMN     "principle_option_2_id" INTEGER,
ADD COLUMN     "protein_category_id" INTEGER,
ADD COLUMN     "protein_option_1_id" INTEGER,
ADD COLUMN     "protein_option_2_id" INTEGER,
ADD COLUMN     "protein_option_3_id" INTEGER,
ADD COLUMN     "soup_category_id" INTEGER,
ADD COLUMN     "soup_option_1_id" INTEGER,
ADD COLUMN     "soup_option_2_id" INTEGER;

-- AlterTable
ALTER TABLE "menu_items" DROP COLUMN "combo_price",
DROP COLUMN "component_type",
DROP COLUMN "is_extra",
DROP COLUMN "is_plate_component",
DROP COLUMN "is_premium",
DROP COLUMN "is_protein",
DROP COLUMN "protein_icon";

-- AlterTable
ALTER TABLE "order_items" DROP COLUMN "is_extra",
DROP COLUMN "is_free_substitution",
DROP COLUMN "is_substitution",
DROP COLUMN "original_item_id";

-- DropTable
DROP TABLE "public"."daily_menu_options";
