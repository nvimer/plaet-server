-- Initial schema migration for Supabase
-- Generated from Prisma schema (plaet-server/prisma/schema.prisma)
-- This migration represents the current production schema

-- ============================
-- ENUMS
-- ============================

CREATE TYPE "RestaurantStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'TRIAL', 'PAST_DUE');
CREATE TYPE "TokenType" AS ENUM ('ACCESS', 'REFRESH', 'RESET_PASSWORD', 'VERIFY_EMAIL', 'IS_USER_UPDATE_DATA');
CREATE TYPE "RoleName" AS ENUM ('ADMIN', 'CASHIER', 'WAITER', 'KITCHEN_MANAGER', 'SUPERADMIN');
CREATE TYPE "TableStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'NEEDS_CLEANING');
CREATE TYPE "OrderStatus" AS ENUM ('OPEN', 'SENT_TO_CASHIER', 'PAID', 'CANCELLED');
CREATE TYPE "OrderItemStatus" AS ENUM ('PENDING', 'IN_KITCHEN', 'READY', 'DELIVERED', 'CANCELLED');
CREATE TYPE "OrderType" AS ENUM ('DINE_IN', 'TAKE_OUT', 'DELIVERY', 'WHATSAPP');
CREATE TYPE "StockAdjustmentType" AS ENUM ('DAILY_RESET', 'MANUAL_ADD', 'MANUAL_REMOVE', 'ORDER_DEDUCT', 'ORDER_CANCELLED', 'AUTO_BLOCKED');
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'NEQUI', 'TICKET_BOOK');
CREATE TYPE "CashClosureStatus" AS ENUM ('OPEN', 'CLOSED');

-- ============================
-- TABLES
-- ============================

CREATE TABLE "restaurants" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL UNIQUE,
    "slug" TEXT NOT NULL UNIQUE,
    "status" "RestaurantStatus" NOT NULL DEFAULT 'TRIAL',
    "address" TEXT,
    "phone" TEXT,
    "nit" TEXT UNIQUE,
    "logo_url" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'COP',
    "timezone" TEXT NOT NULL DEFAULT 'America/Bogota',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3)
);

CREATE TABLE "tokens" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "token" TEXT NOT NULL,
    "type" "TokenType" NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "blacklisted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" UUID NOT NULL
);

CREATE TABLE "roles" (
    "id" SERIAL PRIMARY KEY,
    "name" "RoleName" NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "restaurant_id" UUID
);

CREATE TABLE "permissions" (
    "id" SERIAL PRIMARY KEY,
    "name" TEXT NOT NULL UNIQUE,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3)
);

CREATE TABLE "role_permissions" (
    "role_id" INTEGER NOT NULL,
    "permission_id" INTEGER NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    PRIMARY KEY ("role_id", "permission_id")
);

CREATE TABLE "users" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL UNIQUE,
    "phone" TEXT UNIQUE,
    "password" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "email_verified_at" TIMESTAMP(3),
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "last_failed_login" TIMESTAMP(3),
    "locked_until" TIMESTAMP(3),
    "password_changed_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "must_change_password" BOOLEAN NOT NULL DEFAULT true,
    "restaurant_id" UUID
);

CREATE TABLE "user_roles" (
    "role_id" INTEGER NOT NULL,
    "user_id" UUID NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    PRIMARY KEY ("role_id", "user_id")
);

CREATE TABLE "profiles" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL UNIQUE,
    "photo_url" TEXT,
    "birthDate" TIMESTAMP(3),
    "identification" TEXT,
    "address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "image_public_id" TEXT
);

CREATE TABLE "tables" (
    "id" SERIAL PRIMARY KEY,
    "number" TEXT NOT NULL,
    "status" "TableStatus" NOT NULL DEFAULT 'AVAILABLE',
    "location" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "restaurant_id" UUID
);

CREATE TABLE "menu_categories" (
    "id" SERIAL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "restaurant_id" UUID
);

CREATE TABLE "menu_items" (
    "id" SERIAL PRIMARY KEY,
    "category_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "image_url" TEXT,
    "inventory_type" TEXT NOT NULL DEFAULT 'UNLIMITED',
    "stock_quantity" INTEGER,
    "low_stock_alert" INTEGER DEFAULT 5,
    "auto_mark_unavailable" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "image_public_id" TEXT,
    "restaurant_id" UUID
);

CREATE TABLE "stock_adjustments" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "menu_item_id" INTEGER NOT NULL,
    "previous_stock" INTEGER NOT NULL,
    "new_stock" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT,
    "user_id" UUID,
    "order_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "adjustment_type" "StockAdjustmentType" NOT NULL,
    "restaurant_id" UUID
);

CREATE TABLE "orders" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "table_id" INTEGER,
    "waiter_id" UUID NOT NULL,
    "customerId" UUID,
    "status" "OrderStatus" NOT NULL DEFAULT 'OPEN',
    "type" "OrderType" NOT NULL DEFAULT 'DINE_IN',
    "total_amount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "notes" TEXT,
    "whatsapp_order_id" TEXT UNIQUE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "restaurant_id" UUID,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "cash_closure_id" UUID
);

CREATE TABLE "order_items" (
    "id" SERIAL PRIMARY KEY,
    "order_id" UUID NOT NULL,
    "menu_item_id" INTEGER,
    "quantity" INTEGER NOT NULL,
    "price_at_order" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "status" "OrderItemStatus" NOT NULL DEFAULT 'PENDING'
);

CREATE TABLE "customers" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "phone2" TEXT,
    "address1" TEXT,
    "address2" TEXT,
    "email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "restaurant_id" UUID
);

CREATE TABLE "ticket_books" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "customerId" UUID,
    "purchase_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiry_date" TIMESTAMP(3) NOT NULL,
    "total_portions" INTEGER NOT NULL,
    "consumed_portions" INTEGER NOT NULL DEFAULT 0,
    "purchase_price" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "restaurant_id" UUID
);

CREATE TABLE "ticket_book_usages" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "ticket_book_id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "daily_code_id" UUID NOT NULL,
    "portion_count" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "restaurant_id" UUID
);

CREATE TABLE "payments" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "order_id" UUID,
    "method" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "amount" DECIMAL(10,2) NOT NULL,
    "transaction_ref" TEXT,
    "daily_ticket_book_code_id" UUID UNIQUE,
    "cash_closure_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "expenses" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "category" TEXT NOT NULL,
    "registered_by_id" UUID NOT NULL,
    "restaurant_id" UUID,
    "cash_closure_id" UUID
);

CREATE TABLE "cash_closures" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "opened_by_id" UUID NOT NULL,
    "closed_by_id" UUID,
    "opening_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closing_date" TIMESTAMP(3),
    "opening_balance" DECIMAL(10,2) NOT NULL,
    "expected_balance" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "actual_balance" DECIMAL(10,2),
    "difference" DECIMAL(10,2),
    "total_cash" DECIMAL(10,2) DEFAULT 0.00,
    "total_nequi" DECIMAL(10,2) DEFAULT 0.00,
    "total_expenses" DECIMAL(10,2) DEFAULT 0.00,
    "total_vouchers" DECIMAL(10,2) DEFAULT 0.00,
    "total_delivery" DECIMAL(10,2) DEFAULT 0.00,
    "delivery_cash" DECIMAL(10,2) DEFAULT 0.00,
    "delivery_nequi" DECIMAL(10,2) DEFAULT 0.00,
    "status" "CashClosureStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "restaurant_id" UUID,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3)
);

CREATE TABLE "daily_ticket_book_codes" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "customerId" UUID,
    "code" TEXT NOT NULL UNIQUE,
    "date" DATE NOT NULL,
    "is_used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "restaurant_id" UUID
);

CREATE TABLE "daily_menus" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATE NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "base_price" DECIMAL(10,2) NOT NULL DEFAULT 4000.00,
    "packaging_fee" DECIMAL(10,2) NOT NULL DEFAULT 1000.00,
    "drink_category_id" INTEGER,
    "drink_option_1_id" INTEGER,
    "drink_option_2_id" INTEGER,
    "extra_category_id" INTEGER,
    "extra_option_1_id" INTEGER,
    "extra_option_2_id" INTEGER,
    "principle_category_id" INTEGER,
    "principle_option_1_id" INTEGER,
    "principle_option_2_id" INTEGER,
    "protein_category_id" INTEGER,
    "soup_category_id" INTEGER,
    "soup_option_1_id" INTEGER,
    "soup_option_2_id" INTEGER,
    "rice_category_id" INTEGER,
    "rice_option_1_id" INTEGER,
    "rice_option_2_id" INTEGER,
    "dessert_category_id" INTEGER,
    "dessert_option_1_id" INTEGER,
    "dessert_option_2_id" INTEGER,
    "protein_ids" INTEGER[] DEFAULT '{}',
    "salad_category_id" INTEGER,
    "salad_option_1_id" INTEGER,
    "salad_option_2_id" INTEGER,
    "restaurant_id" UUID,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3)
);

-- ============================
-- INDEXES
-- ============================

CREATE INDEX "idx_roles_restaurant_id" ON "roles"("restaurant_id");
CREATE INDEX "idx_users_restaurant_id" ON "users"("restaurant_id");
CREATE INDEX "idx_tables_restaurant_id" ON "tables"("restaurant_id");
CREATE INDEX "idx_menu_items_restaurant_id" ON "menu_items"("restaurant_id");
CREATE INDEX "idx_stock_adjustments_restaurant_id" ON "stock_adjustments"("restaurant_id");
CREATE INDEX "idx_orders_restaurant_id" ON "orders"("restaurant_id");
CREATE INDEX "idx_customers_restaurant_id" ON "customers"("restaurant_id");
CREATE INDEX "idx_ticket_books_restaurant_id" ON "ticket_books"("restaurant_id");
CREATE INDEX "idx_ticket_book_usages_restaurant_id" ON "ticket_book_usages"("restaurant_id");
CREATE INDEX "idx_expenses_restaurant_id" ON "expenses"("restaurant_id");
CREATE INDEX "idx_cash_closures_restaurant_id" ON "cash_closures"("restaurant_id");
CREATE INDEX "idx_daily_ticket_book_codes_restaurant_id" ON "daily_ticket_book_codes"("restaurant_id");
CREATE INDEX "idx_daily_menus_created_at" ON "daily_menus"("created_at");
CREATE INDEX "idx_daily_menus_is_active" ON "daily_menus"("isActive");
CREATE INDEX "idx_daily_menus_restaurant_id" ON "daily_menus"("restaurant_id");

-- ============================
-- UNIQUE INDEXES
-- ============================

CREATE UNIQUE INDEX "roles_restaurant_id_name_key" ON "roles"("restaurant_id", "name");
CREATE UNIQUE INDEX "tables_restaurant_id_number_key" ON "tables"("restaurant_id", "number");
CREATE UNIQUE INDEX "menu_categories_restaurant_id_name_key" ON "menu_categories"("restaurant_id", "name");
CREATE UNIQUE INDEX "menu_items_restaurant_id_category_id_name_key" ON "menu_items"("restaurant_id", "category_id", "name");
CREATE UNIQUE INDEX "customers_restaurant_id_phone_key" ON "customers"("restaurant_id", "phone");
CREATE UNIQUE INDEX "customers_restaurant_id_email_key" ON "customers"("restaurant_id", "email");
CREATE UNIQUE INDEX "daily_ticket_book_codes_customerId_date_key" ON "daily_ticket_book_codes"("customerId", "date");

-- ============================
-- FOREIGN KEYS
-- ============================

ALTER TABLE "tokens" ADD CONSTRAINT "tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "roles" ADD CONSTRAINT "roles_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "users" ADD CONSTRAINT "users_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tables" ADD CONSTRAINT "tables_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "menu_categories" ADD CONSTRAINT "menu_categories_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "menu_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_waiter_id_fkey" FOREIGN KEY ("waiter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_cash_closure_id_fkey" FOREIGN KEY ("cash_closure_id") REFERENCES "cash_closures"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "customers" ADD CONSTRAINT "customers_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ticket_books" ADD CONSTRAINT "ticket_books_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ticket_books" ADD CONSTRAINT "ticket_books_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ticket_book_usages" ADD CONSTRAINT "ticket_book_usages_ticket_book_id_fkey" FOREIGN KEY ("ticket_book_id") REFERENCES "ticket_books"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ticket_book_usages" ADD CONSTRAINT "ticket_book_usages_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ticket_book_usages" ADD CONSTRAINT "ticket_book_usages_daily_code_id_fkey" FOREIGN KEY ("daily_code_id") REFERENCES "daily_ticket_book_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ticket_book_usages" ADD CONSTRAINT "ticket_book_usages_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_daily_ticket_book_code_id_fkey" FOREIGN KEY ("daily_ticket_book_code_id") REFERENCES "daily_ticket_book_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_cash_closure_id_fkey" FOREIGN KEY ("cash_closure_id") REFERENCES "cash_closures"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_registered_by_id_fkey" FOREIGN KEY ("registered_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_cash_closure_id_fkey" FOREIGN KEY ("cash_closure_id") REFERENCES "cash_closures"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cash_closures" ADD CONSTRAINT "cash_closures_opened_by_id_fkey" FOREIGN KEY ("opened_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cash_closures" ADD CONSTRAINT "cash_closures_closed_by_id_fkey" FOREIGN KEY ("closed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cash_closures" ADD CONSTRAINT "cash_closures_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "daily_ticket_book_codes" ADD CONSTRAINT "daily_ticket_book_codes_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "daily_ticket_book_codes" ADD CONSTRAINT "daily_ticket_book_codes_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "daily_menus" ADD CONSTRAINT "daily_menus_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
