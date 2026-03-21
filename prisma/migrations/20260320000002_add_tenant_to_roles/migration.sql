-- AlterTable
ALTER TABLE "roles" DROP CONSTRAINT IF EXISTS "roles_name_key";
ALTER TABLE "roles" ADD COLUMN "restaurant_id" TEXT;

-- AlterTable
ALTER TABLE "permissions" ADD COLUMN "is_system" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "roles_restaurant_id_idx" ON "roles"("restaurant_id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_restaurant_id_name_key" ON "roles"("restaurant_id", "name");

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Mark sensitive permissions as is_system
UPDATE "permissions" SET "is_system" = true WHERE "name" IN ('restaurants:manage', 'roles:manage', 'permissions:view');
