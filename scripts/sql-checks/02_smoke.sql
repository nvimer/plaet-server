-- Prueba funcional de las RPC contra datos reales SIN dejar rastro:
-- todo ocurre dentro de una transacción que termina en ROLLBACK.
-- Ejecuta el bloque completo de una sola vez.

BEGIN;

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

ROLLBACK;  -- nada de lo anterior queda guardado
