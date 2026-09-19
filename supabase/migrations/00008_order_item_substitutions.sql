-- ============================
-- SUBSTITUTIONS AND PAID EXTRAS
-- ============================
-- A lunch may swap one slot for another at no cost (soup for juice, salad for
-- rice) or carry a paid extra. The API has accepted isSubstitution,
-- originalItemId and isExtra since the Express days (order.validator.ts) but
-- nothing ever stored them: the swap ended up inside notes as a string with
-- emojis, parsed back with string matching.
--
-- The protein is not swappable: it sets the price of the lunch and has its own
-- selector, so a pricier protein is a surcharge inside price_at_order, not a
-- substitution.

ALTER TABLE "order_items"
  ADD COLUMN IF NOT EXISTS "is_substitution" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "replaces_category_type" "MenuCategoryType",
  ADD COLUMN IF NOT EXISTS "original_item_id" INTEGER,
  ADD COLUMN IF NOT EXISTS "is_extra" BOOLEAN NOT NULL DEFAULT false;

DO $$ BEGIN
  ALTER TABLE "order_items"
    ADD CONSTRAINT "order_items_original_item_id_fkey"
    FOREIGN KEY ("original_item_id") REFERENCES "menu_items"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- A substitution is free by definition, and it always says which slot it covers.
DO $$ BEGIN
  ALTER TABLE "order_items"
    ADD CONSTRAINT "order_items_substitution_is_free"
    CHECK (NOT "is_substitution" OR ("price_at_order" = 0 AND "replaces_category_type" IS NOT NULL));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- The same item cannot be a free swap and a paid extra at once.
DO $$ BEGIN
  ALTER TABLE "order_items"
    ADD CONSTRAINT "order_items_substitution_xor_extra"
    CHECK (NOT ("is_substitution" AND "is_extra"));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "idx_order_items_replaces_category_type"
  ON "order_items"("replaces_category_type") WHERE "is_substitution";

-- create_order_tx has to carry the new fields through; the rest is unchanged
-- from migration 00005.

CREATE OR REPLACE FUNCTION public.create_order_tx(p_payload JSONB)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_restaurant_id UUID := (p_payload->>'restaurant_id')::UUID;
  v_order_id UUID := NULLIF(p_payload->>'existing_order_id', '')::UUID;
  v_skip_stock BOOLEAN := COALESCE((p_payload->>'skip_stock')::BOOLEAN, false);
  v_table_id INTEGER := NULLIF(p_payload->>'table_id', '')::INTEGER;
  v_items JSONB := COALESCE(p_payload->'items', '[]'::JSONB);
  v_item RECORD;
  v_total NUMERIC(10,2);
BEGIN
  IF v_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'TENANT_REQUIRED: restaurant_id is required';
  END IF;

  IF jsonb_array_length(v_items) = 0 THEN
    RAISE EXCEPTION 'NO_ITEMS: at least one item is required';
  END IF;

  -- Lock every tracked item up front, always in the same order, so two orders
  -- for the last portions can't both pass the check.
  PERFORM 1
  FROM menu_items mi
  WHERE mi.id IN (
      SELECT DISTINCT (i->>'menu_item_id')::INTEGER
      FROM jsonb_array_elements(v_items) i
      WHERE i->>'menu_item_id' IS NOT NULL
    )
    AND mi.deleted = false
  ORDER BY mi.id
  FOR UPDATE;

  IF NOT v_skip_stock THEN
    FOR v_item IN
      SELECT (i->>'menu_item_id')::INTEGER AS menu_item_id,
             SUM((i->>'quantity')::INTEGER) AS quantity
      FROM jsonb_array_elements(v_items) i
      WHERE i->>'menu_item_id' IS NOT NULL
      GROUP BY 1
    LOOP
      PERFORM 1 FROM menu_items mi
      WHERE mi.id = v_item.menu_item_id
        AND mi.deleted = false
        AND mi.restaurant_id = v_restaurant_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'ITEM_NOT_FOUND: menu item % does not belong to this restaurant', v_item.menu_item_id;
      END IF;

      PERFORM 1 FROM menu_items mi
      WHERE mi.id = v_item.menu_item_id AND mi.is_available = false;

      IF FOUND THEN
        RAISE EXCEPTION 'ITEMS_NOT_AVAILABLE: menu item % is not available', v_item.menu_item_id;
      END IF;

      PERFORM 1 FROM menu_items mi
      WHERE mi.id = v_item.menu_item_id
        AND mi.inventory_type = 'TRACKED'
        AND COALESCE(mi.stock_quantity, 0) < v_item.quantity;

      IF FOUND THEN
        RAISE EXCEPTION 'INSUFFICIENT_STOCK: not enough stock for menu item %', v_item.menu_item_id;
      END IF;
    END LOOP;
  END IF;

  IF v_order_id IS NOT NULL THEN
    PERFORM 1 FROM orders
    WHERE id = v_order_id AND restaurant_id = v_restaurant_id AND deleted = false
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'ORDER_NOT_FOUND: order % does not belong to this restaurant', v_order_id;
    END IF;
  ELSE
    INSERT INTO orders (
      waiter_id, table_id, "customerId", status, type, total_amount, notes,
      whatsapp_order_id, restaurant_id, cash_closure_id, created_at, updated_at
    ) VALUES (
      (p_payload->>'waiter_id')::UUID,
      v_table_id,
      NULLIF(p_payload->>'customer_id', '')::UUID,
      COALESCE(NULLIF(p_payload->>'status', ''), 'OPEN')::"OrderStatus",
      (p_payload->>'type')::"OrderType",
      0,
      NULLIF(p_payload->>'notes', ''),
      NULLIF(p_payload->>'whatsapp_order_id', ''),
      v_restaurant_id,
      NULLIF(p_payload->>'cash_closure_id', '')::UUID,
      COALESCE(NULLIF(p_payload->>'created_at', '')::TIMESTAMP, NOW()),
      NOW()
    )
    RETURNING id INTO v_order_id;
  END IF;

  INSERT INTO order_items (order_id, menu_item_id, quantity, price_at_order, notes, status,
                           is_substitution, replaces_category_type, original_item_id, is_extra, updated_at)
  SELECT v_order_id,
         NULLIF(i->>'menu_item_id', '')::INTEGER,
         (i->>'quantity')::INTEGER,
         (i->>'price')::NUMERIC(10,2),
         NULLIF(i->>'notes', ''),
         COALESCE(NULLIF(i->>'status', ''), 'PENDING')::"OrderItemStatus",
         COALESCE((i->>'is_substitution')::BOOLEAN, false),
         NULLIF(i->>'replaces_category_type', '')::"MenuCategoryType",
         NULLIF(i->>'original_item_id', '')::INTEGER,
         COALESCE((i->>'is_extra')::BOOLEAN, false),
         NOW()
  FROM jsonb_array_elements(v_items) i;

  IF NOT v_skip_stock THEN
    FOR v_item IN
      SELECT (i->>'menu_item_id')::INTEGER AS menu_item_id,
             SUM((i->>'quantity')::INTEGER)::INTEGER AS quantity
      FROM jsonb_array_elements(v_items) i
      WHERE i->>'menu_item_id' IS NOT NULL
      GROUP BY 1
    LOOP
      PERFORM deduct_stock(v_item.menu_item_id, v_item.quantity, v_order_id, (p_payload->>'waiter_id')::UUID);
    END LOOP;
  END IF;

  SELECT COALESCE(SUM(price_at_order * quantity), 0) INTO v_total
  FROM order_items WHERE order_id = v_order_id AND deleted = false;

  UPDATE orders SET total_amount = v_total, updated_at = NOW() WHERE id = v_order_id;

  IF p_payload->>'status' = 'PAID' AND NULLIF(p_payload->>'existing_order_id', '') IS NULL THEN
    INSERT INTO payments (order_id, amount, method, cash_closure_id)
    VALUES (v_order_id, v_total, 'CASH', NULLIF(p_payload->>'cash_closure_id', '')::UUID);
  END IF;

  IF v_table_id IS NOT NULL AND COALESCE((p_payload->>'occupy_table')::BOOLEAN, false) THEN
    UPDATE tables SET status = 'OCCUPIED', updated_at = NOW()
    WHERE id = v_table_id AND restaurant_id = v_restaurant_id;
  END IF;

  RETURN v_order_id;
END;
$$;
