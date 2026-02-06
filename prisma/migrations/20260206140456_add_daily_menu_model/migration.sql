-- CreateTable
CREATE TABLE "daily_menus" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "side" TEXT NOT NULL,
    "soup" TEXT NOT NULL,
    "drink" TEXT NOT NULL,
    "dessert" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_menus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "daily_menus_date_key" ON "daily_menus"("date");

-- CreateIndex
CREATE INDEX "daily_menus_date_idx" ON "daily_menus"("date");

-- CreateIndex
CREATE INDEX "daily_menus_isActive_idx" ON "daily_menus"("isActive");
