/*
  Warnings:

  - You are about to drop the column `date` on the `daily_menus` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[restaurant_id,phone]` on the table `customers` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[restaurant_id,email]` on the table `customers` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[created_at]` on the table `daily_menus` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[restaurant_id,name]` on the table `menu_categories` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `menu_items` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[restaurant_id,category_id,name]` on the table `menu_items` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[restaurant_id,number]` on the table `tables` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `restaurant_id` to the `cash_closures` table without a default value. This is not possible if the table is not empty.
  - Added the required column `restaurant_id` to the `customers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `restaurant_id` to the `daily_menus` table without a default value. This is not possible if the table is not empty.
  - Added the required column `restaurant_id` to the `expenses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `restaurant_id` to the `menu_categories` table without a default value. This is not possible if the table is not empty.
  - Added the required column `restaurant_id` to the `menu_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `restaurant_id` to the `orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `restaurant_id` to the `tables` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "RestaurantStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'TRIAL', 'PAST_DUE');

-- AlterEnum
ALTER TYPE "RoleName" ADD VALUE 'SUPERADMIN';

-- DropIndex
DROP INDEX "public"."daily_menus_date_idx";

-- DropIndex
DROP INDEX "public"."daily_menus_date_key";

-- DropIndex
DROP INDEX "public"."menu_items_category_id_name_key";

-- DropIndex
DROP INDEX "public"."tables_number_key";

-- AlterTable
ALTER TABLE "cash_closures" ADD COLUMN     "restaurant_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "restaurant_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "daily_menus" DROP COLUMN "date",
ADD COLUMN     "restaurant_id" TEXT NOT NULL,
ALTER COLUMN "created_at" DROP DEFAULT,
ALTER COLUMN "created_at" SET DATA TYPE DATE;

-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "restaurant_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "menu_categories" ADD COLUMN     "restaurant_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "menu_items" ADD COLUMN     "restaurant_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "restaurant_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "tables" ADD COLUMN     "restaurant_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "restaurant_id" TEXT;

-- CreateTable
CREATE TABLE "restaurants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "RestaurantStatus" NOT NULL DEFAULT 'TRIAL',
    "address" TEXT,
    "phone" TEXT,
    "nit" TEXT,
    "logo_url" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'COP',
    "timezone" TEXT NOT NULL DEFAULT 'America/Bogota',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "restaurants_name_key" ON "restaurants"("name");

-- CreateIndex
CREATE UNIQUE INDEX "restaurants_slug_key" ON "restaurants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "restaurants_nit_key" ON "restaurants"("nit");

-- CreateIndex
CREATE INDEX "cash_closures_restaurant_id_idx" ON "cash_closures"("restaurant_id");

-- CreateIndex
CREATE UNIQUE INDEX "customers_restaurant_id_phone_key" ON "customers"("restaurant_id", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "customers_restaurant_id_email_key" ON "customers"("restaurant_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "daily_menus_created_at_key" ON "daily_menus"("created_at");

-- CreateIndex
CREATE INDEX "daily_menus_created_at_idx" ON "daily_menus"("created_at");

-- CreateIndex
CREATE INDEX "daily_menus_restaurant_id_idx" ON "daily_menus"("restaurant_id");

-- CreateIndex
CREATE INDEX "expenses_restaurant_id_idx" ON "expenses"("restaurant_id");

-- CreateIndex
CREATE UNIQUE INDEX "menu_categories_restaurant_id_name_key" ON "menu_categories"("restaurant_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "menu_items_name_key" ON "menu_items"("name");

-- CreateIndex
CREATE UNIQUE INDEX "menu_items_restaurant_id_category_id_name_key" ON "menu_items"("restaurant_id", "category_id", "name");

-- CreateIndex
CREATE INDEX "orders_restaurant_id_idx" ON "orders"("restaurant_id");

-- CreateIndex
CREATE UNIQUE INDEX "tables_restaurant_id_number_key" ON "tables"("restaurant_id", "number");

-- CreateIndex
CREATE INDEX "users_restaurant_id_idx" ON "users"("restaurant_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tables" ADD CONSTRAINT "tables_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_categories" ADD CONSTRAINT "menu_categories_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_closures" ADD CONSTRAINT "cash_closures_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_menus" ADD CONSTRAINT "daily_menus_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
