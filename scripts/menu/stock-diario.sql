-- ============================
-- CARGA DIARIA DE PORCIONES
-- ============================
-- Provisional: la app todavía no tiene endpoint de inventario.
-- Edita las cantidades de abajo y corre el script cada mañana.
-- Las proteínas que no menciones quedan en 0 (no se venden).

WITH porciones(nombre, cantidad) AS (VALUES
  ('Chuleta de cerdo',            20),
  ('Chuleta de pollo',            20),
  ('Pechuga a la plancha',        15),
  ('Pollo frito',                 15),
  ('Carne de cerdo a la plancha',  0),
  ('Carne de res a la plancha',    0),
  ('Pollo en salsa BBQ de la casa', 0),
  ('Pescado frito',               10)
)
UPDATE menu_items mi
SET stock_quantity = p.cantidad,
    -- Vuelve a ponerlo disponible si ayer se agotó.
    is_available = p.cantidad > 0,
    updated_at = NOW()
FROM porciones p
WHERE mi.restaurant_id = '8a782271-1f51-4b7a-a1f5-f7650ba44d53'
  AND mi.deleted = false
  AND mi.name = p.nombre;

-- Cómo quedó el día.
SELECT name AS proteina, stock_quantity AS porciones, is_available AS disponible, price AS precio
FROM menu_items
WHERE restaurant_id = '8a782271-1f51-4b7a-a1f5-f7650ba44d53'
  AND deleted = false
  AND inventory_type = 'TRACKED'
ORDER BY name;
