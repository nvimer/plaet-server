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
