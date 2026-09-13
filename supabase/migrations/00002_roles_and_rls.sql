-- ============================
-- SUPABASE ROLES
-- ============================

-- Create custom roles (Supabase already has 'authenticated', 'anon', 'service_role')
-- These are for your app's business logic roles
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'plaet_admin') THEN
    CREATE ROLE plaet_admin NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'plaet_manager') THEN
    CREATE ROLE plaet_manager NOLOGIN;
  END IF;
END $$;

-- Grant base permissions
GRANT USAGE ON SCHEMA public TO authenticated, anon, service_role;
GRANT USAGE ON SCHEMA public TO plaet_admin, plaet_manager;

-- Grant table permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO plaet_admin;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO plaet_manager;

-- Grant sequence permissions
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO plaet_admin;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO plaet_manager;

-- ============================
-- ENABLE RLS ON ALL TABLES
-- ============================

DO $$ DECLARE tbl TEXT; BEGIN
  FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  AND tablename NOT LIKE 'pg_%' AND tablename NOT LIKE '_prisma_%'
  LOOP EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl); END LOOP;
END $$;

-- ============================
-- RLS POLICIES
-- ============================

-- Tenant isolation pattern: users can only see data for their restaurant
-- SUPERADMIN can see everything

-- restaurants: everyone can read their own, SUPERADMIN sees all
CREATE POLICY "tenant_isolation_restaurants" ON "restaurants"
  FOR ALL TO authenticated
  USING (
    (auth.jwt() ->> 'restaurantId') = id::text
    OR (auth.jwt() ->> 'user_role') = 'SUPERADMIN'
  )
  WITH CHECK (
    (auth.jwt() ->> 'restaurantId') = id::text
    OR (auth.jwt() ->> 'user_role') = 'SUPERADMIN'
  );

-- users: see users in your restaurant
CREATE POLICY "tenant_isolation_users" ON "users"
  FOR ALL TO authenticated
  USING (
    (auth.jwt() ->> 'restaurantId') = "restaurant_id"::text
    OR (auth.jwt() ->> 'user_role') = 'SUPERADMIN'
  )
  WITH CHECK (
    (auth.jwt() ->> 'restaurantId') = "restaurant_id"::text
    OR (auth.jwt() ->> 'user_role') = 'SUPERADMIN'
  );

-- roles: see roles in your restaurant
CREATE POLICY "tenant_isolation_roles" ON "roles"
  FOR ALL TO authenticated
  USING (
    (auth.jwt() ->> 'restaurantId') = "restaurant_id"::text
    OR (auth.jwt() ->> 'user_role') = 'SUPERADMIN'
  )
  WITH CHECK (
    (auth.jwt() ->> 'restaurantId') = "restaurant_id"::text
    OR (auth.jwt() ->> 'user_role') = 'SUPERADMIN'
  );

-- orders: tenant isolation
CREATE POLICY "tenant_isolation_orders" ON "orders"
  FOR ALL TO authenticated
  USING (
    (auth.jwt() ->> 'restaurantId') = "restaurant_id"::text
    OR (auth.jwt() ->> 'user_role') = 'SUPERADMIN'
  )
  WITH CHECK (
    (auth.jwt() ->> 'restaurantId') = "restaurant_id"::text
    OR (auth.jwt() ->> 'user_role') = 'SUPERADMIN'
  );

-- order_items: via order's restaurant
CREATE POLICY "tenant_isolation_order_items" ON "order_items"
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "orders"
      WHERE "orders".id = "order_items"."order_id"
      AND (
        (auth.jwt() ->> 'restaurantId') = "orders"."restaurant_id"::text
        OR (auth.jwt() ->> 'user_role') = 'SUPERADMIN'
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "orders"
      WHERE "orders".id = "order_items"."order_id"
      AND (
        (auth.jwt() ->> 'restaurantId') = "orders"."restaurant_id"::text
        OR (auth.jwt() ->> 'user_role') = 'SUPERADMIN'
      )
    )
  );

-- customers: tenant isolation
CREATE POLICY "tenant_isolation_customers" ON "customers"
  FOR ALL TO authenticated
  USING (
    (auth.jwt() ->> 'restaurantId') = "restaurant_id"::text
    OR (auth.jwt() ->> 'user_role') = 'SUPERADMIN'
  )
  WITH CHECK (
    (auth.jwt() ->> 'restaurantId') = "restaurant_id"::text
    OR (auth.jwt() ->> 'user_role') = 'SUPERADMIN'
  );

-- menu_categories: tenant isolation
CREATE POLICY "tenant_isolation_menu_categories" ON "menu_categories"
  FOR ALL TO authenticated
  USING (
    (auth.jwt() ->> 'restaurantId') = "restaurant_id"::text
    OR (auth.jwt() ->> 'user_role') = 'SUPERADMIN'
  )
  WITH CHECK (
    (auth.jwt() ->> 'restaurantId') = "restaurant_id"::text
    OR (auth.jwt() ->> 'user_role') = 'SUPERADMIN'
  );

-- menu_items: tenant isolation
CREATE POLICY "tenant_isolation_menu_items" ON "menu_items"
  FOR ALL TO authenticated
  USING (
    (auth.jwt() ->> 'restaurantId') = "restaurant_id"::text
    OR (auth.jwt() ->> 'user_role') = 'SUPERADMIN'
  )
  WITH CHECK (
    (auth.jwt() ->> 'restaurantId') = "restaurant_id"::text
    OR (auth.jwt() ->> 'user_role') = 'SUPERADMIN'
  );

-- tables: tenant isolation
CREATE POLICY "tenant_isolation_tables" ON "tables"
  FOR ALL TO authenticated
  USING (
    (auth.jwt() ->> 'restaurantId') = "restaurant_id"::text
    OR (auth.jwt() ->> 'user_role') = 'SUPERADMIN'
  )
  WITH CHECK (
    (auth.jwt() ->> 'restaurantId') = "restaurant_id"::text
    OR (auth.jwt() ->> 'user_role') = 'SUPERADMIN'
  );

-- payments: via order's restaurant
CREATE POLICY "tenant_isolation_payments" ON "payments"
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "orders"
      WHERE "orders".id = "payments"."order_id"
      AND (
        (auth.jwt() ->> 'restaurantId') = "orders"."restaurant_id"::text
        OR (auth.jwt() ->> 'user_role') = 'SUPERADMIN'
      )
    )
    OR "order_id" IS NULL
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "orders"
      WHERE "orders".id = "payments"."order_id"
      AND (
        (auth.jwt() ->> 'restaurantId') = "orders"."restaurant_id"::text
        OR (auth.jwt() ->> 'user_role') = 'SUPERADMIN'
      )
    )
    OR "order_id" IS NULL
  );

-- expenses: tenant isolation
CREATE POLICY "tenant_isolation_expenses" ON "expenses"
  FOR ALL TO authenticated
  USING (
    (auth.jwt() ->> 'restaurantId') = "restaurant_id"::text
    OR (auth.jwt() ->> 'user_role') = 'SUPERADMIN'
  )
  WITH CHECK (
    (auth.jwt() ->> 'restaurantId') = "restaurant_id"::text
    OR (auth.jwt() ->> 'user_role') = 'SUPERADMIN'
  );

-- cash_closures: tenant isolation
CREATE POLICY "tenant_isolation_cash_closures" ON "cash_closures"
  FOR ALL TO authenticated
  USING (
    (auth.jwt() ->> 'restaurantId') = "restaurant_id"::text
    OR (auth.jwt() ->> 'user_role') = 'SUPERADMIN'
  )
  WITH CHECK (
    (auth.jwt() ->> 'restaurantId') = "restaurant_id"::text
    OR (auth.jwt() ->> 'user_role') = 'SUPERADMIN'
  );

-- daily_menus: tenant isolation
CREATE POLICY "tenant_isolation_daily_menus" ON "daily_menus"
  FOR ALL TO authenticated
  USING (
    (auth.jwt() ->> 'restaurantId') = "restaurant_id"::text
    OR (auth.jwt() ->> 'user_role') = 'SUPERADMIN'
  )
  WITH CHECK (
    (auth.jwt() ->> 'restaurantId') = "restaurant_id"::text
    OR (auth.jwt() ->> 'user_role') = 'SUPERADMIN'
  );

-- ticket_books: tenant isolation
CREATE POLICY "tenant_isolation_ticket_books" ON "ticket_books"
  FOR ALL TO authenticated
  USING (
    (auth.jwt() ->> 'restaurantId') = "restaurant_id"::text
    OR (auth.jwt() ->> 'user_role') = 'SUPERADMIN'
  )
  WITH CHECK (
    (auth.jwt() ->> 'restaurantId') = "restaurant_id"::text
    OR (auth.jwt() ->> 'user_role') = 'SUPERADMIN'
  );

-- ticket_book_usages: tenant isolation
CREATE POLICY "tenant_isolation_ticket_book_usages" ON "ticket_book_usages"
  FOR ALL TO authenticated
  USING (
    (auth.jwt() ->> 'restaurantId') = "restaurant_id"::text
    OR (auth.jwt() ->> 'user_role') = 'SUPERADMIN'
  )
  WITH CHECK (
    (auth.jwt() ->> 'restaurantId') = "restaurant_id"::text
    OR (auth.jwt() ->> 'user_role') = 'SUPERADMIN'
  );

-- daily_ticket_book_codes: tenant isolation
CREATE POLICY "tenant_isolation_daily_ticket_book_codes" ON "daily_ticket_book_codes"
  FOR ALL TO authenticated
  USING (
    (auth.jwt() ->> 'restaurantId') = "restaurant_id"::text
    OR (auth.jwt() ->> 'user_role') = 'SUPERADMIN'
  )
  WITH CHECK (
    (auth.jwt() ->> 'restaurantId') = "restaurant_id"::text
    OR (auth.jwt() ->> 'user_role') = 'SUPERADMIN'
  );

-- stock_adjustments: tenant isolation
CREATE POLICY "tenant_isolation_stock_adjustments" ON "stock_adjustments"
  FOR ALL TO authenticated
  USING (
    (auth.jwt() ->> 'restaurantId') = "restaurant_id"::text
    OR (auth.jwt() ->> 'user_role') = 'SUPERADMIN'
  )
  WITH CHECK (
    (auth.jwt() ->> 'restaurantId') = "restaurant_id"::text
    OR (auth.jwt() ->> 'user_role') = 'SUPERADMIN'
  );

-- profiles: users see their own profile, admins see all in restaurant
CREATE POLICY "tenant_isolation_profiles" ON "profiles"
  FOR ALL TO authenticated
  USING (
    (auth.jwt() ->> 'sub') = "user_id"::text
    OR (auth.jwt() ->> 'user_role') = 'SUPERADMIN'
  )
  WITH CHECK (
    (auth.jwt() ->> 'sub') = "user_id"::text
    OR (auth.jwt() ->> 'user_role') = 'SUPERADMIN'
  );

-- tokens: users see their own tokens
CREATE POLICY "tenant_isolation_tokens" ON "tokens"
  FOR ALL TO authenticated
  USING (
    (auth.jwt() ->> 'sub') = "userId"::text
    OR (auth.jwt() ->> 'user_role') = 'SUPERADMIN'
  )
  WITH CHECK (
    (auth.jwt() ->> 'sub') = "userId"::text
    OR (auth.jwt() ->> 'user_role') = 'SUPERADMIN'
  );

-- permissions: readable by all authenticated (system-wide)
CREATE POLICY "read_permissions" ON "permissions"
  FOR SELECT TO authenticated
  USING (true);

-- role_permissions: via role's restaurant
CREATE POLICY "tenant_isolation_role_permissions" ON "role_permissions"
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "roles"
      WHERE "roles".id = "role_permissions"."role_id"
      AND (
        (auth.jwt() ->> 'restaurantId') = "roles"."restaurant_id"::text
        OR (auth.jwt() ->> 'user_role') = 'SUPERADMIN'
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "roles"
      WHERE "roles".id = "role_permissions"."role_id"
      AND (
        (auth.jwt() ->> 'restaurantId') = "roles"."restaurant_id"::text
        OR (auth.jwt() ->> 'user_role') = 'SUPERADMIN'
      )
    )
  );

-- user_roles: via role's restaurant
CREATE POLICY "tenant_isolation_user_roles" ON "user_roles"
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "roles"
      WHERE "roles".id = "user_roles"."role_id"
      AND (
        (auth.jwt() ->> 'restaurantId') = "roles"."restaurant_id"::text
        OR (auth.jwt() ->> 'user_role') = 'SUPERADMIN'
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "roles"
      WHERE "roles".id = "user_roles"."role_id"
      AND (
        (auth.jwt() ->> 'restaurantId') = "roles"."restaurant_id"::text
        OR (auth.jwt() ->> 'user_role') = 'SUPERADMIN'
      )
    )
  );
