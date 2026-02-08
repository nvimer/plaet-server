# Database Schema Migration: Daily Menu Redesign

## 🗂️ Overview

This migration simplifies the `MenuItem` model and completely redesigns the `DailyMenu` model to support a category-based lunch menu system.

## 📊 Changes Made

### 1. MenuItem - Removed Fields
The following fields were removed from `MenuItem` as they were redundant or unused:

- ❌ `isExtra` - All items can potentially be extras
- ❌ `isProtein` - Identified by category "Proteínas"
- ❌ `proteinIcon` - Not needed for the business logic
- ❌ `isPlateComponent` - Identified by categories
- ❌ `componentType` - Using categories instead
- ❌ `comboPrice` - Using standard price field
- ❌ `isPremium` - Price is determined by item's category and standard price

### 2. DailyMenu - Complete Redesign

**Old Structure:**
- Stored text strings (e.g., `side: "Arroz"`, `soup: "Sopa de verduras"`)
- No relation to actual MenuItems
- Limited flexibility

**New Structure:**
- Stores references to actual `MenuItem` records
- Supports multiple options per category (up to 2 options for soup, principle, drink, extra; up to 3 for proteins)
- Price configuration: `basePrice` (10,000) and `premiumProteinPrice` (11,000)
- Category references for organization

### 3. New Categories Created

Default categories for daily menu organization:

1. **Sopas** - Soups of the day
2. **Principios** - Main sides (beans, lentils, chickpeas)
3. **Proteínas** - Meats and proteins
4. **Arroz** - Rice and base carbs
5. **Ensaladas** - Salads and vegetables
6. **Jugos** - Drinks and juices
7. **Extras** - Additional sides (plantain, potato)
8. **Postres** - Desserts (currently inactive)

## 🚀 Migration Steps

### Step 1: Run the Migration SQL

```bash
# Connect to your database and run the migration SQL file
psql $DATABASE_URL -f prisma/migrations/20250207_simplify_menu_and_redesign_daily_menu/migration.sql
```

Or using Prisma:
```bash
npx prisma migrate dev --name simplify_menu_and_redesign_daily_menu
```

### Step 2: Seed the Categories

```bash
# Run the seed script to create default categories
npx ts-node prisma/seed-daily-menu-categories.ts
```

### Step 3: Regenerate Prisma Client

```bash
npx prisma generate
```

### Step 4: Verify Migration

Check that:
1. Categories were created successfully
2. MenuItem table no longer has the removed columns
3. DailyMenu table has the new structure with foreign keys

## 💡 Business Logic

### Price Calculation

The daily lunch menu has two price tiers:

- **Base Price**: $10,000 (for chicken, pork)
- **Premium Price**: $11,000 (for beef, fish)

Example:
- Client selects "Chuleta de cerdo" → $10,000
- Client selects "Carne de res" → $11,000

### Menu Structure

Each day, the admin configures:
- **2 Soup options** (client picks 1)
- **2 Principle options** (client picks 1)  
- **2-3 Protein options** (client picks 1 - determines price)
- **2 Juice options** (client picks 1)
- **2 Extra options** (client picks 1: plantain or potato)

**Always included (no selection needed):**
- Rice (Arroz)
- Salad (Ensalada)

### Extras

Clients can add additional items at unit price:
- Extra portion of potatoes: +$4,000
- Extra meat: +unit price of that protein

## 📝 Next Steps

1. **Backend API**: Update endpoints to work with new schema
2. **Frontend**: Update DailyMenuPage to use category-based selectors
3. **Testing**: Create test orders with the new structure

## ⚠️ Important Notes

- The old DailyMenu data will be lost (backup if needed)
- All items must be assigned to appropriate categories
- Rice and Salad categories are for organization only (always included)
