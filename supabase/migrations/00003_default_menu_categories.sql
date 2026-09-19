-- ============================
-- DEFAULT MENU CATEGORIES
-- ============================
-- Restaurants created through the restaurants-create Edge Function before this
-- migration got no categories, which blocks creating menu items and the daily menu.
-- Backfill every active restaurant that has none. Idempotent.

INSERT INTO "menu_categories" ("name", "description", "order", "restaurant_id")
SELECT c.name, c.description, c.order, r.id
FROM "restaurants" r
CROSS JOIN (VALUES
  ('Sopas', 'Sopas y caldos tradicionales elaborados diariamente con ingredientes frescos y el sabor de casa.', 1),
  ('Arroces', 'Nuestra base infaltable: opciones de arroz siempre suelto y con el punto exacto de sazón.', 2),
  ('Principios', 'La esencia del menú: acompañamientos caseros calientes como frijoles, lentejas, garbanzos, pastas o verduras guisadas.', 3),
  ('Proteínas', 'Variedad de carnes, pollo o pescado con preparaciones clásicas: a la plancha, en salsa, sudadas o fritas.', 4),
  ('Bebidas', 'Opciones refrescantes para acompañar tu almuerzo, incluyendo jugos naturales del día y limonadas.', 5),
  ('Extras', 'Porciones adicionales para complementar tu plato a tu gusto, como aguacate, tajadas de plátano maduro o huevo frito.', 6),
  ('Ensaladas', 'Acompañamientos frescos y ligeros, preparados con vegetales de temporada y aderezos caseros.', 7),
  ('Postres', 'El toque dulce tradicional para cerrar el almuerzo, con opciones típicas y porciones justas.', 8)
) AS c(name, description, "order")
WHERE r.deleted = false
  AND NOT EXISTS (
    SELECT 1 FROM "menu_categories" mc
    WHERE mc.restaurant_id = r.id AND mc.deleted = false
  )
ON CONFLICT DO NOTHING;
