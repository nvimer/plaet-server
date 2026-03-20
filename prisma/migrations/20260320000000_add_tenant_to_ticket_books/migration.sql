-- AlterTable
ALTER TABLE "ticket_books" ADD COLUMN "purchase_price" DECIMAL(10,2) NOT NULL DEFAULT 0.00;
ALTER TABLE "ticket_books" ADD COLUMN "restaurant_id" TEXT;

-- AlterTable
ALTER TABLE "ticket_book_usages" ADD COLUMN "restaurant_id" TEXT;

-- AlterTable
ALTER TABLE "daily_ticket_book_codes" ADD COLUMN "restaurant_id" TEXT;

-- CreateIndex
CREATE INDEX "ticket_books_restaurant_id_idx" ON "ticket_books"("restaurant_id");

-- CreateIndex
CREATE INDEX "ticket_book_usages_restaurant_id_idx" ON "ticket_book_usages"("restaurant_id");

-- CreateIndex
CREATE INDEX "daily_ticket_book_codes_restaurant_id_idx" ON "daily_ticket_book_codes"("restaurant_id");

-- AddForeignKey
ALTER TABLE "ticket_books" ADD CONSTRAINT "ticket_books_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_book_usages" ADD CONSTRAINT "ticket_book_usages_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_ticket_book_codes" ADD CONSTRAINT "daily_ticket_book_codes_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
