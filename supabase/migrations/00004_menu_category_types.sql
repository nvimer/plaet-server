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
