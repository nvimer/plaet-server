-- Antes de aplicar 00004-00006. Ninguna de estas consultas escribe nada.

-- 1) ¿Algún restaurante tiene más de una caja abierta? Debe devolver 0 filas,
--    o la migración 00005 se detiene a propósito.
SELECT restaurant_id, COUNT(*) AS cajas_abiertas
FROM cash_closures WHERE status = 'OPEN' AND deleted = false
GROUP BY restaurant_id HAVING COUNT(*) > 1;

-- 2) ¿Hay categorías que normalizan al mismo rol dentro de un restaurante?
--    Debe devolver 0 filas, o el índice único de 00004 falla.
SELECT restaurant_id, translate(lower(trim(name)), 'áéíóúüñ', 'aeiouun') AS nombre, COUNT(*)
FROM menu_categories WHERE deleted = false
GROUP BY 1, 2 HAVING COUNT(*) > 1;

-- 3) ¿Qué versiones de las funciones existen hoy? 00005 borra estas firmas
--    antes de recrearlas; conviene ver qué había.
SELECT proname, pg_get_function_arguments(oid) AS argumentos
FROM pg_proc WHERE pronamespace = 'public'::regnamespace
  AND proname IN ('deduct_stock','revert_stock','create_order_tx','close_cash_closure_tx','sell_ticket_book_tx');

-- 4) Valores reales de los enums, para confirmar si producción se desfasó del repo.
SELECT t.typname, string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder)
FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
WHERE t.typname IN ('OrderStatus','OrderItemStatus','PaymentMethod','StockAdjustmentType')
GROUP BY 1;
