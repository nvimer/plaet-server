-- ============================
-- SEED DATA - Plaet Initial Setup
-- ============================
-- Default credentials:
--   Superadmin: admin@plaet.cloud / Admin123!
--   Restaurant: Sazonarte (demo)

-- ============================
-- 1. SYSTEM PERMISSIONS
-- ============================

INSERT INTO "permissions" ("name", "description", "is_system", "created_at", "updated_at") VALUES
  ('users:read', 'Read user information', true, NOW(), NOW()),
  ('users:create', 'Create new users', true, NOW(), NOW()),
  ('users:update', 'Update user information', true, NOW(), NOW()),
  ('users:delete', 'Delete users', true, NOW(), NOW()),
  ('roles:manage', 'Manage roles and permissions', true, NOW(), NOW()),
  ('menu:read', 'View menu items', true, NOW(), NOW()),
  ('menu:manage', 'Create and manage menu items', true, NOW(), NOW()),
  ('stock:manage', 'Manage inventory stock', true, NOW(), NOW()),
  ('tables:manage', 'Manage restaurant tables', true, NOW(), NOW()),
  ('orders:read', 'View orders', true, NOW(), NOW()),
  ('orders:create', 'Create new orders', true, NOW(), NOW()),
  ('orders:update', 'Update order status', true, NOW(), NOW()),
  ('orders:cancel', 'Cancel orders', true, NOW(), NOW()),
  ('orders:pay', 'Process payments', true, NOW(), NOW()),
  ('kitchen:view', 'View kitchen queue', true, NOW(), NOW()),
  ('kitchen:update', 'Update kitchen order status', true, NOW(), NOW()),
  ('cash:manage', 'Manage cash register', true, NOW(), NOW()),
  ('expenses:manage', 'Manage expenses', true, NOW(), NOW()),
  ('analytics:view', 'View analytics and reports', true, NOW(), NOW()),
  ('settings:update', 'Update restaurant settings', true, NOW(), NOW()),
  ('ticket_books:manage', 'Manage ticket books', true, NOW(), NOW())
ON CONFLICT ("name") DO NOTHING;

-- ============================
-- 2. DEMO RESTAURANT
-- ============================

INSERT INTO "restaurants" ("id", "name", "slug", "status", "address", "phone", "currency", "timezone", "created_at", "updated_at")
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'Sazonarte',
  'sazonarte',
  'ACTIVE',
  'Calle 123 #45-67, Bogota',
  '+57 300 123 4567',
  'COP',
  'America/Bogota',
  NOW(),
  NOW()
);

-- ============================
-- 3. SUPERADMIN USER
-- ============================

INSERT INTO "users" ("id", "first_name", "last_name", "email", "password", "must_change_password", "email_verified", "created_at", "updated_at")
VALUES (
  'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  'Super',
  'Admin',
  'admin@plaet.cloud',
  '$2b$10$0vFj2Aqa31vLyszVUBwSs.0SWdB9gOsjUS9ywySVnUmj2ChbGi0fa',
  false,
  true,
  NOW(),
  NOW()
);

-- ============================
-- 4. SUPERADMIN ROLE (global, no restaurant)
-- ============================

INSERT INTO "roles" ("id", "name", "description", "created_at", "updated_at")
VALUES (1, 'SUPERADMIN', 'System administrator with full access', NOW(), NOW())
ON CONFLICT DO NOTHING;

INSERT INTO "user_roles" ("role_id", "user_id", "created_at", "updated_at")
VALUES (1, 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ============================
-- 5. TENANT ROLES FOR SAZONARTE
-- ============================

-- ADMIN role
INSERT INTO "roles" ("id", "name", "description", "restaurant_id", "created_at", "updated_at")
VALUES (2, 'ADMIN', 'Dueño/Gerente del restaurante con acceso total', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- WAITER role
INSERT INTO "roles" ("id", "name", "description", "restaurant_id", "created_at", "updated_at")
VALUES (3, 'WAITER', 'Mesero - Toma pedidos y gestiona mesas', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- CASHIER role
INSERT INTO "roles" ("id", "name", "description", "restaurant_id", "created_at", "updated_at")
VALUES (4, 'CASHIER', 'Cajero - Gestiona pagos y cierres de caja', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- KITCHEN_MANAGER role
INSERT INTO "roles" ("id", "name", "description", "restaurant_id", "created_at", "updated_at")
VALUES (5, 'KITCHEN_MANAGER', 'Cocina - Visualiza y prepara pedidos', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ============================
-- 6. ROLE-PERMISSION ASSIGNMENTS
-- ============================

-- ADMIN gets all permissions
INSERT INTO "role_permissions" ("role_id", "permission_id", "created_at", "updated_at")
SELECT 2, id, NOW(), NOW() FROM "permissions" WHERE "is_system" = true
ON CONFLICT DO NOTHING;

-- WAITER permissions
INSERT INTO "role_permissions" ("role_id", "permission_id", "created_at", "updated_at")
SELECT 3, id, NOW(), NOW() FROM "permissions" WHERE "name" IN ('menu:read', 'tables:manage', 'orders:read', 'orders:create', 'orders:update')
ON CONFLICT DO NOTHING;

-- CASHIER permissions
INSERT INTO "role_permissions" ("role_id", "permission_id", "created_at", "updated_at")
SELECT 4, id, NOW(), NOW() FROM "permissions" WHERE "name" IN ('menu:read', 'orders:read', 'orders:pay', 'cash:manage', 'expenses:manage', 'analytics:view')
ON CONFLICT DO NOTHING;

-- KITCHEN_MANAGER permissions
INSERT INTO "role_permissions" ("role_id", "permission_id", "created_at", "updated_at")
SELECT 5, id, NOW(), NOW() FROM "permissions" WHERE "name" IN ('menu:read', 'orders:read', 'kitchen:view', 'kitchen:update')
ON CONFLICT DO NOTHING;

-- ============================
-- 7. DEFAULT TABLES
-- ============================

INSERT INTO "tables" ("number", "status", "location", "restaurant_id", "created_at", "updated_at") VALUES
  ('1', 'AVAILABLE', 'Sala principal', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW(), NOW()),
  ('2', 'AVAILABLE', 'Sala principal', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW(), NOW()),
  ('3', 'AVAILABLE', 'Sala principal', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW(), NOW()),
  ('4', 'AVAILABLE', 'Terraza', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW(), NOW()),
  ('5', 'AVAILABLE', 'Terraza', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ============================
-- 8. DEFAULT MENU CATEGORIES
-- ============================

INSERT INTO "menu_categories" ("name", "description", "order", "restaurant_id") VALUES
  ('Sopas', 'Sopas del dia', 1, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
  ('Principios', 'Guarniciones y principios', 2, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
  ('Proteinas', 'Carnes, pollo, pescado', 3, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
  ('Bebidas', 'Bebidas naturales y gaseosas', 4, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
  ('Extras', 'Adiciones extras', 5, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
ON CONFLICT DO NOTHING;
