-- Migration: Simplify MenuItem and Redesign DailyMenu
-- This migration removes unused fields from MenuItem and redesigns DailyMenu to use MenuItem references

-- Step 1: Remove unused fields from MenuItem
ALTER TABLE menu_items 
DROP COLUMN IF EXISTS is_extra,
DROP COLUMN IF EXISTS is_protein,
DROP COLUMN IF EXISTS protein_icon,
DROP COLUMN IF EXISTS is_plate_component,
DROP COLUMN IF EXISTS component_type,
DROP COLUMN IF EXISTS combo_price,
DROP COLUMN IF EXISTS is_premium;

-- Step 2: Backup existing DailyMenu data (optional, for reference)
-- CREATE TABLE daily_menus_backup AS SELECT * FROM daily_menus;

-- Step 3: Drop existing DailyMenu table and recreate with new structure
DROP TABLE IF EXISTS daily_menu_options;
DROP TABLE IF EXISTS daily_menus;

-- Step 4: Create new DailyMenu table with MenuItem references
CREATE TABLE daily_menus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    base_price DECIMAL(10,2) DEFAULT 10000.00,
    premium_protein_price DECIMAL(10,2) DEFAULT 11000.00,
    
    -- Category references
    soup_category_id INTEGER REFERENCES menu_categories(id),
    principle_category_id INTEGER REFERENCES menu_categories(id),
    protein_category_id INTEGER REFERENCES menu_categories(id),
    drink_category_id INTEGER REFERENCES menu_categories(id),
    extra_category_id INTEGER REFERENCES menu_categories(id),
    
    -- Item options (up to 2 per category, except protein which can have 3)
    soup_option_1_id INTEGER REFERENCES menu_items(id),
    soup_option_2_id INTEGER REFERENCES menu_items(id),
    principle_option_1_id INTEGER REFERENCES menu_items(id),
    principle_option_2_id INTEGER REFERENCES menu_items(id),
    protein_option_1_id INTEGER REFERENCES menu_items(id),
    protein_option_2_id INTEGER REFERENCES menu_items(id),
    protein_option_3_id INTEGER REFERENCES menu_items(id),
    drink_option_1_id INTEGER REFERENCES menu_items(id),
    drink_option_2_id INTEGER REFERENCES menu_items(id),
    extra_option_1_id INTEGER REFERENCES menu_items(id),
    extra_option_2_id INTEGER REFERENCES menu_items(id),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 5: Create indexes for performance
CREATE INDEX idx_daily_menus_date ON daily_menus(date);
CREATE INDEX idx_daily_menus_is_active ON daily_menus(is_active);

-- Step 6: Create default menu categories for Daily Menu
-- Note: These will be inserted via seed script, but included here for reference

-- Categories to be created:
-- 1. Sopas (Soups)
-- 2. Principios (Main sides - lentils, beans, etc.)
-- 3. Proteínas (Proteins - chicken, pork, beef, fish)
-- 4. Arroz (Rice - always included, no selection needed)
-- 5. Ensaladas (Salads - always included, no selection needed)
-- 6. Jugos (Juices - daily juice options)
-- 7. Extras (Extras - plantain, potato, etc.)
-- 8. Postres (Desserts - inactive for now)

-- Step 7: Update OrderItem to remove isExtra references if needed
-- Note: is_extra field in OrderItem is kept as it tracks if item was added as extra to an order

-- Step 8: Verify migration
COMMENT ON TABLE daily_menus IS 'Daily lunch menu configuration with item references';
COMMENT ON COLUMN daily_menus.base_price IS 'Price for standard proteins (chicken, pork)';
COMMENT ON COLUMN daily_menus.premium_protein_price IS 'Price for premium proteins (beef, fish)';
