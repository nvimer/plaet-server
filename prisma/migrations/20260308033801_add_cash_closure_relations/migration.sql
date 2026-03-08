-- AlterTable
ALTER TABLE "cash_closures" ADD COLUMN     "total_cash" DECIMAL(10,2) DEFAULT 0,
ADD COLUMN     "total_expenses" DECIMAL(10,2) DEFAULT 0,
ADD COLUMN     "total_nequi" DECIMAL(10,2) DEFAULT 0,
ADD COLUMN     "total_vouchers" DECIMAL(10,2) DEFAULT 0;

-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "cash_closure_id" TEXT;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "cash_closure_id" TEXT;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "cash_closure_id" TEXT;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_cash_closure_id_fkey" FOREIGN KEY ("cash_closure_id") REFERENCES "cash_closures"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_cash_closure_id_fkey" FOREIGN KEY ("cash_closure_id") REFERENCES "cash_closures"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_cash_closure_id_fkey" FOREIGN KEY ("cash_closure_id") REFERENCES "cash_closures"("id") ON DELETE SET NULL ON UPDATE CASCADE;
