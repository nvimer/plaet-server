-- ============================
-- TRANSACTIONAL RPCs
-- ============================
-- Creating an order and closing the register used to be a dozen separate
-- PostgREST calls from an Edge Function: no transaction, no locking. Two waiters
-- ordering the last portion at the same time could both pass the stock check,
-- and a failure halfway through left orders without items or stock deducted
-- twice. These functions do the whole write in one transaction, taking row locks
-- in a fixed order.
--
-- They are SECURITY DEFINER because Edge Functions call them with the service
-- role; the caller is responsible for tenant checks before calling.

-- ----------------------------
-- Stock
-- ----------------------------
-- deduct_stock / revert_stock were already called by the Edge Functions but were
-- never part of any migration.

-- Older deployments may already have deduct_stock/revert_stock with a different
-- signature. Leaving them in place would make every call ambiguous, so drop any
-- existing overload by name first.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT oid::regprocedure AS sig
    FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace
      AND proname IN ('deduct_stock', 'revert_stock', 'create_order_tx', 'close_cash_closure_tx')
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s;', r.sig);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.deduct_stock(
  p_menu_item_id INTEGER,
  p_quantity INTEGER,
  p_order_id UUID DEFAULT NULL,
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
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'INVALID_QUANTITY: quantity must be positive';
  END IF;

  SELECT id, name, stock_quantity, inventory_type, auto_mark_unavailable, restaurant_id
    INTO v_item
  FROM menu_items
  WHERE id = p_menu_item_id AND deleted = false
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ITEM_NOT_FOUND: menu item % does not exist', p_menu_item_id;
  END IF;

  -- Untracked items have no stock to move.
  IF v_item.inventory_type IS DISTINCT FROM 'TRACKED' THEN
    RETURN v_item.stock_quantity;
  END IF;

  IF COALESCE(v_item.stock_quantity, 0) < p_quantity THEN
    RAISE EXCEPTION 'INSUFFICIENT_STOCK: % has % left', v_item.name, COALESCE(v_item.stock_quantity, 0);
  END IF;

  v_new_stock := COALESCE(v_item.stock_quantity, 0) - p_quantity;

  UPDATE menu_items
  SET stock_quantity = v_new_stock,
      is_available = CASE WHEN auto_mark_unavailable AND v_new_stock <= 0 THEN false ELSE is_available END,
      updated_at = NOW()
  WHERE id = p_menu_item_id;

  INSERT INTO stock_adjustments
    (menu_item_id, previous_stock, new_stock, quantity, reason, user_id, order_id, adjustment_type, restaurant_id)
  VALUES
    (p_menu_item_id, COALESCE(v_item.stock_quantity, 0), v_new_stock, p_quantity,
     'Order deduction', p_user_id, p_order_id, 'ORDER_DEDUCT', v_item.restaurant_id);

  RETURN v_new_stock;
END;
$$;

CREATE OR REPLACE FUNCTION public.revert_stock(
  p_menu_item_id INTEGER,
  p_quantity INTEGER,
  p_order_id UUID DEFAULT NULL,
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
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RETURN NULL;
  END IF;

  SELECT id, stock_quantity, inventory_type, auto_mark_unavailable, restaurant_id
    INTO v_item
  FROM menu_items
  WHERE id = p_menu_item_id AND deleted = false
  FOR UPDATE;

  IF NOT FOUND OR v_item.inventory_type IS DISTINCT FROM 'TRACKED' THEN
    RETURN NULL;
  END IF;

  v_new_stock := COALESCE(v_item.stock_quantity, 0) + p_quantity;

  UPDATE menu_items
  SET stock_quantity = v_new_stock,
      is_available = CASE WHEN auto_mark_unavailable AND v_new_stock > 0 THEN true ELSE is_available END,
      updated_at = NOW()
  WHERE id = p_menu_item_id;

  INSERT INTO stock_adjustments
    (menu_item_id, previous_stock, new_stock, quantity, reason, user_id, order_id, adjustment_type, restaurant_id)
  VALUES
    (p_menu_item_id, COALESCE(v_item.stock_quantity, 0), v_new_stock, p_quantity,
     'Order cancelled', p_user_id, p_order_id, 'ORDER_CANCELLED', v_item.restaurant_id);

  RETURN v_new_stock;
END;
$$;

-- ----------------------------
-- Orders
-- ----------------------------
-- The Edge Function still resolves prices (daily menu, base price, main protein)
-- and passes the resolved rows in; this function owns the writes.
--
-- Payload:
-- {
--   "restaurant_id": uuid, "waiter_id": uuid, "table_id": int|null,
--   "customer_id": uuid|null, "cash_closure_id": uuid|null,
--   "status": text, "type": text, "notes": text|null,
--   "whatsapp_order_id": text|null, "created_at": timestamp|null,
--   "existing_order_id": uuid|null, "skip_stock": bool, "occupy_table": bool,
--   "items": [{ "menu_item_id": int|null, "quantity": int, "price": numeric,
--               "notes": text|null, "status": text }]
-- }

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

  INSERT INTO order_items (order_id, menu_item_id, quantity, price_at_order, notes, status, updated_at)
  SELECT v_order_id,
         NULLIF(i->>'menu_item_id', '')::INTEGER,
         (i->>'quantity')::INTEGER,
         (i->>'price')::NUMERIC(10,2),
         NULLIF(i->>'notes', ''),
         COALESCE(NULLIF(i->>'status', ''), 'PENDING')::"OrderItemStatus",
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

-- ----------------------------
-- Cash closures
-- ----------------------------
-- Only one open register per restaurant, enforced by the database rather than by
-- a check-then-insert that two cashiers can pass at the same time.
DO $$
DECLARE v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM (
    SELECT restaurant_id FROM cash_closures
    WHERE status = 'OPEN' AND deleted = false
    GROUP BY restaurant_id HAVING COUNT(*) > 1
  ) dupes;

  IF v_count > 0 THEN
    RAISE EXCEPTION 'Cannot enforce one open register per restaurant: % restaurant(s) already have more than one open cash closure. Close the extras first.', v_count;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "cash_closures_one_open_per_restaurant"
  ON "cash_closures"("restaurant_id")
  WHERE "status" = 'OPEN' AND "deleted" = false;

CREATE OR REPLACE FUNCTION public.close_cash_closure_tx(
  p_restaurant_id UUID,
  p_closed_by UUID,
  p_actual_balance NUMERIC
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_closure RECORD;
  v_total_cash NUMERIC(10,2);
  v_total_nequi NUMERIC(10,2);
  v_total_vouchers NUMERIC(10,2);
  v_total_expenses NUMERIC(10,2);
  v_delivery_cash NUMERIC(10,2);
  v_delivery_nequi NUMERIC(10,2);
  v_expected NUMERIC(10,2);
BEGIN
  SELECT id, opening_balance INTO v_closure
  FROM cash_closures
  WHERE restaurant_id = p_restaurant_id AND status = 'OPEN' AND deleted = false
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NO_OPEN_CLOSURE: this restaurant has no open register';
  END IF;

  -- One bucket per payment method. TICKET_BOOK lands in vouchers: those lunches
  -- were paid for when the book was sold, so they move no cash today.
  SELECT
    COALESCE(SUM(amount) FILTER (WHERE method = 'CASH'), 0),
    COALESCE(SUM(amount) FILTER (WHERE method = 'NEQUI'), 0),
    COALESCE(SUM(amount) FILTER (WHERE method = 'TICKET_BOOK'), 0)
  INTO v_total_cash, v_total_nequi, v_total_vouchers
  FROM payments WHERE cash_closure_id = v_closure.id;

  -- Delivery is a subset of the above, shown apart so the courier can be settled.
  SELECT
    COALESCE(SUM(p.amount) FILTER (WHERE p.method = 'CASH'), 0),
    COALESCE(SUM(p.amount) FILTER (WHERE p.method = 'NEQUI'), 0)
  INTO v_delivery_cash, v_delivery_nequi
  FROM payments p
  JOIN orders o ON o.id = p.order_id
  WHERE p.cash_closure_id = v_closure.id AND o.type = 'DELIVERY' AND o.deleted = false;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_expenses
  FROM expenses WHERE cash_closure_id = v_closure.id AND deleted = false;

  -- Only cash is in the drawer. Delivery cash is already inside v_total_cash;
  -- the Express version added it again and inflated the expected balance.
  v_expected := v_closure.opening_balance + v_total_cash - v_total_expenses;

  UPDATE cash_closures SET
    closed_by_id = p_closed_by,
    closing_date = NOW(),
    actual_balance = p_actual_balance,
    expected_balance = v_expected,
    difference = p_actual_balance - v_expected,
    total_cash = v_total_cash,
    total_nequi = v_total_nequi,
    total_vouchers = v_total_vouchers,
    total_expenses = v_total_expenses,
    delivery_cash = v_delivery_cash,
    delivery_nequi = v_delivery_nequi,
    total_delivery = v_delivery_cash + v_delivery_nequi,
    status = 'CLOSED',
    updated_at = NOW()
  WHERE id = v_closure.id;

  RETURN v_closure.id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_order_tx(JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.close_cash_closure_tx(UUID, UUID, NUMERIC) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.deduct_stock(INTEGER, INTEGER, UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.revert_stock(INTEGER, INTEGER, UUID, UUID) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_order_tx(JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.close_cash_closure_tx(UUID, UUID, NUMERIC) TO service_role;
GRANT EXECUTE ON FUNCTION public.deduct_stock(INTEGER, INTEGER, UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.revert_stock(INTEGER, INTEGER, UUID, UUID) TO service_role;
