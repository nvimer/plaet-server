-- ============================
-- STOCK MANAGEMENT
-- ============================
-- Loading and correcting stock never left the Express server: the client's
-- useStockManagement hooks call endpoints that exist nowhere, so portions were
-- loaded by hand with scripts/menu/stock-diario.sql.
--
-- Same shape as the other write paths: the row is locked, the movement is logged
-- in stock_adjustments, and availability follows the stock.

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT oid::regprocedure AS sig FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace
      AND proname IN ('adjust_stock_tx', 'daily_stock_reset_tx')
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s;', r.sig);
  END LOOP;
END $$;

-- Manual correction: positive adds, negative removes.
CREATE OR REPLACE FUNCTION public.adjust_stock_tx(
  p_menu_item_id INTEGER,
  p_restaurant_id UUID,
  p_delta INTEGER,
  p_reason TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
  v_new_stock INTEGER;
BEGIN
  IF p_delta IS NULL OR p_delta = 0 THEN
    RAISE EXCEPTION 'INVALID_QUANTITY: quantity must not be zero';
  END IF;

  SELECT id, name, stock_quantity, inventory_type, auto_mark_unavailable, restaurant_id
    INTO v_item
  FROM menu_items
  WHERE id = p_menu_item_id AND deleted = false
  FOR UPDATE;

  IF NOT FOUND OR v_item.restaurant_id IS DISTINCT FROM p_restaurant_id THEN
    RAISE EXCEPTION 'ITEM_NOT_FOUND: menu item % does not belong to this restaurant', p_menu_item_id;
  END IF;

  IF v_item.inventory_type IS DISTINCT FROM 'TRACKED' THEN
    RAISE EXCEPTION 'NOT_TRACKED: % does not track inventory', v_item.name;
  END IF;

  v_new_stock := COALESCE(v_item.stock_quantity, 0) + p_delta;

  IF v_new_stock < 0 THEN
    RAISE EXCEPTION 'INSUFFICIENT_STOCK: % only has % left', v_item.name, COALESCE(v_item.stock_quantity, 0);
  END IF;

  UPDATE menu_items
  SET stock_quantity = v_new_stock,
      is_available = CASE
        WHEN auto_mark_unavailable AND v_new_stock <= 0 THEN false
        WHEN auto_mark_unavailable AND v_new_stock > 0 THEN true
        ELSE is_available
      END,
      updated_at = NOW()
  WHERE id = p_menu_item_id;

  INSERT INTO stock_adjustments
    (menu_item_id, previous_stock, new_stock, quantity, reason, user_id, adjustment_type, restaurant_id)
  VALUES
    (p_menu_item_id, COALESCE(v_item.stock_quantity, 0), v_new_stock, abs(p_delta),
     p_reason, p_user_id,
     -- The CASE yields text; the column is an enum, so it needs the cast.
     (CASE WHEN p_delta > 0 THEN 'MANUAL_ADD' ELSE 'MANUAL_REMOVE' END)::"StockAdjustmentType",
     p_restaurant_id);

  RETURN v_new_stock;
END;
$$;

-- Morning load: sets each item to the portions cooked for the day.
-- Payload: { "restaurant_id", "user_id", "category_id" (optional),
--            "items": [{ "item_id": int, "quantity": int }] }
CREATE OR REPLACE FUNCTION public.daily_stock_reset_tx(p_payload JSONB)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_restaurant_id UUID := (p_payload->>'restaurant_id')::UUID;
  v_user_id UUID := NULLIF(p_payload->>'user_id', '')::UUID;
  v_category_id INTEGER := NULLIF(p_payload->>'category_id', '')::INTEGER;
  v_items JSONB := COALESCE(p_payload->'items', '[]'::JSONB);
  v_row RECORD;
  v_item RECORD;
  v_count INTEGER := 0;
BEGIN
  IF v_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'TENANT_REQUIRED: restaurant_id is required';
  END IF;

  IF jsonb_array_length(v_items) = 0 THEN
    RAISE EXCEPTION 'NO_ITEMS: at least one item is required';
  END IF;

  -- Locked in id order, like create_order_tx, so a reset and an order in flight
  -- cannot interleave halfway.
  FOR v_row IN
    SELECT (i->>'item_id')::INTEGER AS item_id,
           (i->>'quantity')::INTEGER AS quantity
    FROM jsonb_array_elements(v_items) i
    ORDER BY (i->>'item_id')::INTEGER
  LOOP
    IF v_row.quantity IS NULL OR v_row.quantity < 0 THEN
      RAISE EXCEPTION 'INVALID_QUANTITY: quantity for item % must be zero or more', v_row.item_id;
    END IF;

    SELECT id, stock_quantity, inventory_type, auto_mark_unavailable, category_id, restaurant_id
      INTO v_item
    FROM menu_items
    WHERE id = v_row.item_id AND deleted = false
    FOR UPDATE;

    IF NOT FOUND OR v_item.restaurant_id IS DISTINCT FROM v_restaurant_id THEN
      RAISE EXCEPTION 'ITEM_NOT_FOUND: menu item % does not belong to this restaurant', v_row.item_id;
    END IF;

    IF v_category_id IS NOT NULL AND v_item.category_id IS DISTINCT FROM v_category_id THEN
      RAISE EXCEPTION 'CATEGORY_MISMATCH: menu item % is not in category %', v_row.item_id, v_category_id;
    END IF;

    -- Untracked items are skipped instead of failing: the daily list may carry them.
    CONTINUE WHEN v_item.inventory_type IS DISTINCT FROM 'TRACKED';

    UPDATE menu_items
    SET stock_quantity = v_row.quantity,
        is_available = CASE WHEN auto_mark_unavailable THEN v_row.quantity > 0 ELSE is_available END,
        updated_at = NOW()
    WHERE id = v_row.item_id;

    INSERT INTO stock_adjustments
      (menu_item_id, previous_stock, new_stock, quantity, reason, user_id, adjustment_type, restaurant_id)
    VALUES
      (v_row.item_id, COALESCE(v_item.stock_quantity, 0), v_row.quantity,
       abs(v_row.quantity - COALESCE(v_item.stock_quantity, 0)),
       'Daily stock reset', v_user_id, 'DAILY_RESET', v_restaurant_id);

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

CREATE INDEX IF NOT EXISTS "idx_stock_adjustments_created_at"
  ON "stock_adjustments"("restaurant_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_stock_adjustments_menu_item"
  ON "stock_adjustments"("menu_item_id", "created_at" DESC);

REVOKE ALL ON FUNCTION public.adjust_stock_tx(INTEGER, UUID, INTEGER, TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.daily_stock_reset_tx(JSONB) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.adjust_stock_tx(INTEGER, UUID, INTEGER, TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.daily_stock_reset_tx(JSONB) TO service_role;
