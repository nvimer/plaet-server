/*
  Warnings:

  - The values [PENDING,IN_KITCHEN,READY,DELIVERED] on the enum `OrderStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "OrderItemStatus" AS ENUM ('PENDING', 'IN_KITCHEN', 'READY', 'DELIVERED', 'CANCELLED');

-- AlterEnum
BEGIN;
CREATE TYPE "OrderStatus_new" AS ENUM ('OPEN', 'SENT_TO_CASHIER', 'PAID', 'CANCELLED');
ALTER TABLE "public"."orders" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "orders" ALTER COLUMN "status" TYPE "OrderStatus_new" USING ("status"::text::"OrderStatus_new");
ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";
DROP TYPE "public"."OrderStatus_old";
ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'OPEN';
COMMIT;

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "status" "OrderItemStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'OPEN';
