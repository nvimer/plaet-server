-- Migraciones 00004-00008 + prueba funcional, todo en UNA transacción que termina en ROLLBACK.

BEGIN;

-- ============ 00004_menu_category_types.sql ============
-- ============================
-- MENU CATEGORY TYPES
-- ============================
-- The daily menu (corrientazo) used to find its categories by name: the client
-- looked up "Sopas", "Proteínas", etc. Renaming a category broke it. The role a
-- category plays is now explicit data, so restaurants can name their categories
-- however they want.

DO $$ BEGIN
  CREATE TYPE "MenuCategoryType" AS ENUM (
    'SOUP', 'RICE', 'PRINCIPLE', 'PROTEIN', 'DRINK', 'EXTRA', 'SALAD', 'DESSERT', 'OTHER'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "menu_categories"
  ADD COLUMN IF NOT EXISTS "type" "MenuCategoryType" NOT NULL DEFAULT 'OTHER';

-- Backfill from the current names, accent- and case-insensitive, the same way the
-- client matched them. Only the first match per restaurant and role is taken, so
-- near-duplicate names can't break the unique index below.
WITH normalized AS (
  SELECT mc.id, mc.restaurant_id,
         translate(lower(trim(mc.name)), 'áéíóúüñ', 'aeiouun') AS plain_name
  FROM "menu_categories" mc
  WHERE mc.deleted = false AND mc.type = 'OTHER'
),
matched AS (
  SELECT DISTINCT ON (n.restaurant_id, v.type)
         n.id, v.type::"MenuCategoryType" AS type
  FROM normalized n
  JOIN (VALUES
    ('sopas', 'SOUP'),
    ('arroces', 'RICE'),
    ('principios', 'PRINCIPLE'),
    ('proteinas', 'PROTEIN'),
    ('bebidas', 'DRINK'),
    ('extras', 'EXTRA'),
    ('ensaladas', 'SALAD'),
    ('postres', 'DESSERT')
  ) AS v(name, type) ON v.name = n.plain_name
  ORDER BY n.restaurant_id, v.type, n.id
)
UPDATE "menu_categories" mc
SET "type" = m.type
FROM matched m
WHERE mc.id = m.id;

-- One category per role per restaurant, so the lookup is deterministic.
-- OTHER is unconstrained: a restaurant can have as many of its own as it wants.
CREATE UNIQUE INDEX IF NOT EXISTS "menu_categories_restaurant_id_type_key"
  ON "menu_categories"("restaurant_id", "type")
  WHERE "type" <> 'OTHER' AND "deleted" = false;

-- ============ 00005_transactional_functions.sql ============
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

-- ============ 00006_ticket_book_sale.sql ============
-- ============================
-- TICKET BOOK SALE
-- ============================
-- Selling a ticket book creates the book and the cash payment that funds the
-- open register. The Express server did both in one transaction; this keeps that
-- guarantee now that the write comes from an Edge Function.

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT oid::regprocedure AS sig FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace AND proname = 'sell_ticket_book_tx'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s;', r.sig);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.sell_ticket_book_tx(
  p_restaurant_id UUID,
  p_customer_id UUID,
  p_total_portions INTEGER,
  p_purchase_price NUMERIC,
  p_expiry_days INTEGER,
  p_day_start TIMESTAMP,
  p_day_end TIMESTAMP,
  p_daily_limit INTEGER DEFAULT 3
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_closure_id UUID;
  v_books_today INTEGER;
  v_book_id UUID;
BEGIN
  IF p_total_portions IS NULL OR p_total_portions <= 0 THEN
    RAISE EXCEPTION 'INVALID_PORTIONS: total portions must be positive';
  END IF;

  SELECT id INTO v_closure_id
  FROM cash_closures
  WHERE restaurant_id = p_restaurant_id AND status = 'OPEN' AND deleted = false
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CASH_CLOSURE_REQUIRED: No hay un turno de caja abierto. Por favor abre caja antes de vender tiqueteras.';
  END IF;

  -- The customer row is locked so two cashiers can't both pass the daily limit.
  PERFORM 1 FROM customers WHERE id = p_customer_id AND restaurant_id = p_restaurant_id AND deleted = false FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CUSTOMER_NOT_FOUND: customer does not belong to this restaurant';
  END IF;

  SELECT COUNT(*) INTO v_books_today
  FROM ticket_books
  WHERE "customerId" = p_customer_id
    AND restaurant_id = p_restaurant_id
    AND status = 'active'
    AND purchase_date >= p_day_start
    AND purchase_date <= p_day_end;

  IF v_books_today >= p_daily_limit THEN
    RAISE EXCEPTION 'DAILY_TICKET_LIMIT_EXCEEDED: El cliente ya ha adquirido el límite máximo de % tiqueteras hoy. Intenta mañana.', p_daily_limit;
  END IF;

  INSERT INTO ticket_books (
    "customerId", total_portions, consumed_portions, purchase_price,
    purchase_date, expiry_date, status, restaurant_id, updated_at
  ) VALUES (
    p_customer_id, p_total_portions, 0, p_purchase_price,
    NOW(), NOW() + make_interval(days => p_expiry_days), 'active', p_restaurant_id, NOW()
  )
  RETURNING id INTO v_book_id;

  INSERT INTO payments (method, amount, cash_closure_id, transaction_ref)
  VALUES ('CASH', p_purchase_price, v_closure_id,
          format('Venta Tiquetera: %s porciones', p_total_portions));

  RETURN v_book_id;
END;
$$;

REVOKE ALL ON FUNCTION public.sell_ticket_book_tx(UUID, UUID, INTEGER, NUMERIC, INTEGER, TIMESTAMP, TIMESTAMP, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sell_ticket_book_tx(UUID, UUID, INTEGER, NUMERIC, INTEGER, TIMESTAMP, TIMESTAMP, INTEGER) TO service_role;

-- ============ 00007_register_payment.sql ============
-- ============================
-- PAYMENTS
-- ============================
-- Registering a payment was several writes with no transaction, and redeeming a
-- ticket book (consume a portion, stamp the daily code, log the usage, mark the
-- order paid) never made it out of the Express server at all.
--
-- Accounting rule: a ticket book brings cash in when the BOOK is sold. Redeeming
-- a lunch moves no cash, so its payment lives in its own bucket (TICKET_BOOK)
-- and never counts towards the drawer; see close_cash_closure_tx.

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT oid::regprocedure AS sig FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace AND proname = 'register_payment_tx'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s;', r.sig);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.register_payment_tx(p_payload JSONB)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_restaurant_id UUID := (p_payload->>'restaurant_id')::UUID;
  v_order_id UUID := (p_payload->>'order_id')::UUID;
  v_method TEXT := COALESCE(NULLIF(p_payload->>'method', ''), 'CASH');
  v_amount NUMERIC(10,2) := (p_payload->>'amount')::NUMERIC(10,2);
  v_closure_id UUID := NULLIF(p_payload->>'cash_closure_id', '')::UUID;
  v_portions INTEGER := COALESCE((p_payload->>'portion_count')::INTEGER, 1);
  v_local_date DATE := (p_payload->>'local_date')::DATE;
  v_order RECORD;
  v_customer_id UUID;
  v_book RECORD;
  v_code_id UUID;
  v_payment_id UUID;
  v_total_paid NUMERIC(10,2);
BEGIN
  SELECT id, total_amount, status, table_id, restaurant_id, cash_closure_id, "customerId"
    INTO v_order
  FROM orders
  WHERE id = v_order_id AND deleted = false
  FOR UPDATE;

  IF NOT FOUND OR v_order.restaurant_id IS DISTINCT FROM v_restaurant_id THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND: order does not belong to this restaurant';
  END IF;

  IF v_order.status = 'CANCELLED' THEN
    RAISE EXCEPTION 'ORDER_CANCELLED: a cancelled order cannot be paid';
  END IF;

  v_closure_id := COALESCE(v_closure_id, v_order.cash_closure_id);

  IF v_method = 'TICKET_BOOK' THEN
    -- One lunch is one portion; several portions mean several lunches on the
    -- same order. A pricier protein or a paid extra is not another portion:
    -- that surcharge is paid with another method, which is what the balance
    -- check below leaves room for.
    IF v_portions <= 0 THEN
      RAISE EXCEPTION 'INVALID_PORTIONS: portion count must be positive';
    END IF;

    SELECT COALESCE(SUM(amount), 0) INTO v_total_paid FROM payments WHERE order_id = v_order_id;
    IF v_amount > v_order.total_amount - v_total_paid THEN
      RAISE EXCEPTION 'TICKET_EXCEEDS_BALANCE: the book cannot cover more than the % pending on this order', v_order.total_amount - v_total_paid;
    END IF;

    v_customer_id := COALESCE(NULLIF(p_payload->>'customer_id', '')::UUID, v_order."customerId");
    IF v_customer_id IS NULL THEN
      RAISE EXCEPTION 'CUSTOMER_REQUIRED: a ticket book payment needs a customer';
    END IF;

    -- Oldest book with portions left, locked so two cashiers can't spend the same one.
    SELECT id, total_portions, consumed_portions INTO v_book
    FROM ticket_books
    WHERE "customerId" = v_customer_id
      AND restaurant_id = v_restaurant_id
      AND deleted = false
      AND status = 'active'
      AND consumed_portions < total_portions
      AND expiry_date >= NOW()
    ORDER BY expiry_date ASC
    LIMIT 1
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'NO_ACTIVE_TICKET_BOOK: the customer has no ticket book with portions left';
    END IF;

    IF v_book.consumed_portions + v_portions > v_book.total_portions THEN
      RAISE EXCEPTION 'INSUFFICIENT_PORTIONS: the book only has % portion(s) left', v_book.total_portions - v_book.consumed_portions;
    END IF;

    -- One code per customer per day; payments.daily_ticket_book_code_id is unique,
    -- so a customer redeems once a day and can take several portions in that one go.
    SELECT id INTO v_code_id
    FROM daily_ticket_book_codes
    WHERE "customerId" = v_customer_id AND date = v_local_date
    FOR UPDATE;

    IF NOT FOUND THEN
      INSERT INTO daily_ticket_book_codes ("customerId", code, date, is_used, restaurant_id)
      VALUES (v_customer_id,
              'TB-' || upper(substr(md5(random()::text), 1, 6)),
              v_local_date, true, v_restaurant_id)
      RETURNING id INTO v_code_id;
    ELSE
      IF EXISTS (SELECT 1 FROM payments WHERE daily_ticket_book_code_id = v_code_id) THEN
        RAISE EXCEPTION 'TICKET_ALREADY_REDEEMED_TODAY: this customer already used their ticket book today';
      END IF;
      UPDATE daily_ticket_book_codes SET is_used = true WHERE id = v_code_id;
    END IF;

    UPDATE ticket_books
    SET consumed_portions = consumed_portions + v_portions,
        status = CASE WHEN consumed_portions + v_portions >= total_portions THEN 'completed' ELSE status END,
        updated_at = NOW()
    WHERE id = v_book.id;
  END IF;

  INSERT INTO payments (order_id, method, amount, transaction_ref, cash_closure_id, daily_ticket_book_code_id)
  VALUES (v_order_id, v_method::"PaymentMethod", v_amount,
          NULLIF(p_payload->>'transaction_ref', ''), v_closure_id, v_code_id)
  RETURNING id INTO v_payment_id;

  IF v_method = 'TICKET_BOOK' THEN
    INSERT INTO ticket_book_usages (ticket_book_id, payment_id, daily_code_id, portion_count, restaurant_id, updated_at)
    VALUES (v_book.id, v_payment_id, v_code_id, v_portions, v_restaurant_id, NOW());
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM payments WHERE order_id = v_order_id;

  IF v_total_paid >= v_order.total_amount AND v_order.status <> 'PAID' THEN
    UPDATE orders SET status = 'PAID', updated_at = NOW() WHERE id = v_order_id;
  END IF;

  RETURN v_payment_id;
END;
$$;

REVOKE ALL ON FUNCTION public.register_payment_tx(JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_payment_tx(JSONB) TO service_role;

-- ============ 00008_order_item_substitutions.sql ============
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

-- ============ prueba funcional ============


-- Contexto: tu restaurante, un mesero y un ítem con stock.

WITH ctx AS (
  SELECT
    (SELECT id FROM users WHERE restaurant_id = '8a782271-1f51-4b7a-a1f5-f7650ba44d53' AND deleted = false LIMIT 1) AS waiter_id,
    (SELECT id FROM menu_items WHERE restaurant_id = '8a782271-1f51-4b7a-a1f5-f7650ba44d53' AND deleted = false LIMIT 1) AS item_id,
    (SELECT id FROM cash_closures WHERE restaurant_id = '8a782271-1f51-4b7a-a1f5-f7650ba44d53' AND status = 'OPEN' AND deleted = false LIMIT 1) AS closure_id
)
SELECT * FROM ctx;  -- si waiter_id o item_id salen nulos, ajusta los filtros

-- 1) Crear un pedido completo en una sola llamada.
SELECT create_order_tx(jsonb_build_object(
  'restaurant_id', '8a782271-1f51-4b7a-a1f5-f7650ba44d53',
  'waiter_id',     (SELECT id FROM users WHERE restaurant_id = '8a782271-1f51-4b7a-a1f5-f7650ba44d53' AND deleted = false LIMIT 1),
  'type',          'TAKE_OUT',
  'status',        'OPEN',
  'skip_stock',    false,
  'occupy_table',  false,
  'cash_closure_id', (SELECT id FROM cash_closures WHERE restaurant_id = '8a782271-1f51-4b7a-a1f5-f7650ba44d53' AND status = 'OPEN' AND deleted = false LIMIT 1),
  'items', jsonb_build_array(jsonb_build_object(
    'menu_item_id', (SELECT id FROM menu_items WHERE restaurant_id = '8a782271-1f51-4b7a-a1f5-f7650ba44d53' AND deleted = false LIMIT 1),
    'quantity', 2,
    'price', 5000,
    'status', 'PENDING'
  ))
)) AS pedido_creado;

-- 2) El total tiene que ser 10000 (2 x 5000), no 0.
SELECT id, total_amount, status FROM orders ORDER BY created_at DESC LIMIT 1;

-- 3) Los ítems quedaron colgados del pedido.
SELECT oi.quantity, oi.price_at_order, oi.status
FROM order_items oi JOIN orders o ON o.id = oi.order_id
ORDER BY o.created_at DESC, oi.id LIMIT 5;

-- 4) Si el ítem era TRACKED, debe existir el movimiento de stock.
SELECT adjustment_type, quantity, previous_stock, new_stock
FROM stock_adjustments ORDER BY created_at DESC LIMIT 3;

-- 5) Un pedido sin ítems debe fallar con NO_ITEMS.
--    Descomenta para verlo; aborta la transacción, así que déjalo de último.
-- SELECT create_order_tx(jsonb_build_object(
--   'restaurant_id', '8a782271-1f51-4b7a-a1f5-f7650ba44d53',
--   'waiter_id', (SELECT id FROM users WHERE restaurant_id = '8a782271-1f51-4b7a-a1f5-f7650ba44d53' LIMIT 1),
--   'type', 'TAKE_OUT', 'items', '[]'::jsonb));


ROLLBACK;  -- nada de esto queda guardado