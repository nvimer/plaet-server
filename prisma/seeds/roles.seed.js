"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantRolesTemplate = exports.globalRoles = void 0;
exports.seedRoles = seedRoles;
exports.seedRestaurantRoles = seedRestaurantRoles;
const client_1 = require("@prisma/client");
const logger_1 = require("../../src/config/logger");
const prisma = new client_1.PrismaClient();
exports.globalRoles = [
    {
        name: client_1.RoleName.SUPERADMIN,
        description: "Administrador global del sistema (SaaS)",
        permissions: [
            "users:read",
            "users:create",
            "users:update",
            "users:delete",
            "roles:manage",
            "restaurants:manage",
            "menu:read",
            "menu:manage",
            "stock:manage",
            "tables:manage",
            "orders:read",
            "orders:create",
            "orders:update",
            "orders:cancel",
            "orders:pay",
            "kitchen:view",
            "kitchen:update",
            "cash:manage",
            "expenses:manage",
            "analytics:view",
            "settings:update",
        ],
    },
];
exports.tenantRolesTemplate = [
    {
        name: client_1.RoleName.ADMIN,
        description: "Dueño/Gerente del restaurante con acceso total local",
        permissions: [
            "users:read",
            "users:create",
            "users:update",
            "users:delete",
            "roles:manage",
            "menu:read",
            "menu:manage",
            "stock:manage",
            "tables:manage",
            "orders:read",
            "orders:create",
            "orders:update",
            "orders:cancel",
            "orders:pay",
            "kitchen:view",
            "kitchen:update",
            "cash:manage",
            "expenses:manage",
            "analytics:view",
            "settings:update",
        ],
    },
    {
        name: client_1.RoleName.WAITER,
        description: "Mesero - Toma pedidos y gestiona mesas",
        permissions: [
            "menu:read",
            "tables:manage",
            "orders:read",
            "orders:create",
            "orders:update",
        ],
    },
    {
        name: client_1.RoleName.CASHIER,
        description: "Cajero - Gestiona pagos y cierres de caja",
        permissions: [
            "menu:read",
            "orders:read",
            "orders:pay",
            "cash:manage",
            "expenses:manage",
            "analytics:view",
        ],
    },
    {
        name: client_1.RoleName.KITCHEN_MANAGER,
        description: "Cocina - Visualiza y prepara pedidos",
        permissions: ["menu:read", "orders:read", "kitchen:view", "kitchen:update"],
    },
];
function seedRoles() {
    return __awaiter(this, void 0, void 0, function* () {
        logger_1.logger.info("🌱 Seeding global roles...");
        for (const roleConfig of exports.globalRoles) {
            const role = yield prisma.role.upsert({
                where: { restaurantId_name: { restaurantId: null, name: roleConfig.name } },
                update: { description: roleConfig.description },
                create: {
                    name: roleConfig.name,
                    description: roleConfig.description,
                    restaurantId: null,
                },
            });
            logger_1.logger.info(` 📝 Global Role ${roleConfig.name} seeded`);
            for (const permissionName of roleConfig.permissions) {
                const permission = yield prisma.permission.findUnique({
                    where: { name: permissionName },
                });
                if (permission) {
                    yield txRolePermission(role.id, permission.id);
                }
            }
        }
    });
}
function txRolePermission(roleId, permissionId) {
    return __awaiter(this, void 0, void 0, function* () {
        yield prisma.rolePermission.upsert({
            where: {
                roleId_permissionId: {
                    roleId,
                    permissionId,
                },
            },
            update: {},
            create: {
                roleId,
                permissionId,
            },
        });
    });
}
function seedRestaurantRoles(restaurantId) {
    return __awaiter(this, void 0, void 0, function* () {
        logger_1.logger.info(`🌱 Seeding roles for restaurant ${restaurantId}...`);
        for (const roleConfig of exports.tenantRolesTemplate) {
            const role = yield prisma.role.upsert({
                where: { restaurantId_name: { restaurantId, name: roleConfig.name } },
                update: { description: roleConfig.description },
                create: {
                    name: roleConfig.name,
                    description: roleConfig.description,
                    restaurantId,
                },
            });
            for (const permissionName of roleConfig.permissions) {
                const permission = yield prisma.permission.findUnique({
                    where: { name: permissionName },
                });
                if (permission) {
                    yield txRolePermission(role.id, permission.id);
                }
            }
        }
    });
}
//# sourceMappingURL=roles.seed.js.map