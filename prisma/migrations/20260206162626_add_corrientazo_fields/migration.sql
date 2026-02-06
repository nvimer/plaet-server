-- AlterTable
ALTER TABLE "menu_items" ADD COLUMN     "combo_price" DECIMAL(10,2),
ADD COLUMN     "component_type" TEXT,
ADD COLUMN     "is_plate_component" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_premium" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_protein" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "protein_icon" TEXT;

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "is_extra" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_substitution" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "original_item_id" INTEGER;
