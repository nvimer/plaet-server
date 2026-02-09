import { RoleName } from "@prisma/client";

// Create mock functions
const mockFindMany = jest.fn();
const mockFindUnique = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockUpdateMany = jest.fn();
const mockCount = jest.fn();
const mockRolePermissionDeleteMany = jest.fn();
const mockRolePermissionCreateMany = jest.fn();
const mockTransaction = jest.fn();

// Mock Prisma
jest.mock("../../../../database/prisma", () => ({
  __esModule: true,
  default: {
    role: {
      findMany: mockFindMany,
      findUnique: mockFindUnique,
      create: mockCreate,
      update: mockUpdate,
      updateMany: mockUpdateMany,
      count: mockCount,
    },
    rolePermission: {
      deleteMany: mockRolePermissionDeleteMany,
      createMany: mockRolePermissionCreateMany,
    },
    $transaction: mockTransaction,
  },
}));

// Mock pagination helper
jest.mock("../../../../utils/pagination.helper", () => ({
  createPaginatedResponse: jest.fn((data, total, params) => ({
    data,
    meta: {
      total,
      page: params.page,
      limit: params.limit,
      totalPages: Math.ceil(total / params.limit) || 1,
      hasNextPage: params.page < Math.ceil(total / params.limit),
      hasPreviousPage: params.page > 1,
    },
  })),
}));

import roleRepository from "../../role.repository";
import { createRoleFixture } from "../helpers";

describe("RoleRepository", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default transaction mock
    mockTransaction.mockImplementation(async (callback) => {
      const mockTx = {
        role: {
          update: mockUpdate,
          findUnique: mockFindUnique,
        },
        rolePermission: {
          deleteMany: mockRolePermissionDeleteMany,
          createMany: mockRolePermissionCreateMany,
        },
      };
      return await callback(mockTx);
    });
  });

  describe("findAll", () => {
    it("should return paginated roles", async () => {
      // Arrange
      const mockRoles = [
        createRoleFixture({ id: 1, name: RoleName.ADMIN }),
        createRoleFixture({ id: 2, name: RoleName.WAITER }),
      ];
      mockFindMany.mockResolvedValue(mockRoles);
      mockCount.mockResolvedValue(2);

      // Act
      const result = await roleRepository.findAll({ page: 1, limit: 10 });

      // Assert
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
    });

    it("should calculate skip correctly for pagination", async () => {
      // Arrange
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(20);

      // Act
      await roleRepository.findAll({ page: 2, limit: 5 });

      // Assert
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5,
          take: 5,
        }),
      );
    });

    it("should filter out deleted roles", async () => {
      // Arrange
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      // Act
      await roleRepository.findAll({ page: 1, limit: 10 });

      // Assert
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deleted: false },
        }),
      );
    });

    it("should order by name ascending", async () => {
      // Arrange
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      // Act
      await roleRepository.findAll({ page: 1, limit: 10 });

      // Assert
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { name: "asc" },
        }),
      );
    });
  });

  describe("searchRoles", () => {
    it("should search roles by name (case insensitive)", async () => {
      // Arrange
      const mockRoles = [createRoleFixture({ name: RoleName.ADMIN })];
      mockFindMany.mockResolvedValue(mockRoles);
      mockCount.mockResolvedValue(1);

      // Act
      const result = await roleRepository.searchRoles(
        { page: 1, limit: 10 },
        "admin",
      );

      // Assert
      expect(result.data).toHaveLength(1);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: {
              contains: "admin",
              mode: "insensitive",
            },
          }),
        }),
      );
    });

    it("should filter by active status when provided", async () => {
      // Arrange
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      // Act
      await roleRepository.searchRoles({ page: 1, limit: 10 }, "test", true);

      // Assert
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            active: true,
          }),
        }),
      );
    });

    it("should not include active filter when not provided", async () => {
      // Arrange
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      // Act
      await roleRepository.searchRoles({ page: 1, limit: 10 }, "test");

      // Assert
      const callArgs = mockFindMany.mock.calls[0][0];
      expect(callArgs.where.active).toBeUndefined();
    });
  });

  describe("findById", () => {
    it("should return role when id exists", async () => {
      // Arrange
      const mockRole = createRoleFixture({ id: 5 });
      mockFindUnique.mockResolvedValue(mockRole);

      // Act
      const result = await roleRepository.findById(5);

      // Assert
      expect(result).toEqual(mockRole);
      expect(mockFindUnique).toHaveBeenCalledWith({ where: { id: 5 } });
    });

    it("should return null when id does not exist", async () => {
      // Arrange
      mockFindUnique.mockResolvedValue(null);

      // Act
      const result = await roleRepository.findById(999);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe("createRole", () => {
    it("should create role with permissions", async () => {
      // Arrange
      const createData = {
        name: RoleName.CASHIER,
        description: "Cashier role",
        permissionIds: [1, 2, 3],
      };
      const mockCreatedRole = createRoleFixture({
        id: 10,
        name: RoleName.CASHIER,
      });
      mockCreate.mockResolvedValue(mockCreatedRole);

      // Act
      const result = await roleRepository.createRole(createData);

      // Assert
      expect(result).toEqual(mockCreatedRole);
      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: RoleName.CASHIER,
          description: "Cashier role",
          permissions: {
            create: [
              { permission: { connect: { id: 1 } } },
              { permission: { connect: { id: 2 } } },
              { permission: { connect: { id: 3 } } },
            ],
          },
        }),
        include: {
          permissions: { include: { permission: true } },
        },
      });
    });

    it("should create role without permissions", async () => {
      // Arrange
      const createData = {
        name: RoleName.WAITER,
        description: "Waiter role",
        permissionIds: [],
      };
      const mockCreatedRole = createRoleFixture({ name: RoleName.WAITER });
      mockCreate.mockResolvedValue(mockCreatedRole);

      // Act
      const result = await roleRepository.createRole(createData);

      // Assert
      expect(result).toEqual(mockCreatedRole);
      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          permissions: { create: [] },
        }),
        include: expect.any(Object),
      });
    });
  });

  describe("updateRole", () => {
    it("should update role fields without changing permissions", async () => {
      // Arrange
      const updateData = { description: "Updated description" };
      const mockUpdatedRole = createRoleFixture({
        id: 1,
        description: "Updated description",
      });
      mockUpdate.mockResolvedValue(mockUpdatedRole);

      // Act
      const result = await roleRepository.updateRole(1, updateData);

      // Assert
      expect(result.description).toBe("Updated description");
      expect(mockRolePermissionDeleteMany).not.toHaveBeenCalled();
    });

    it("should replace permissions when permissionIds provided", async () => {
      // Arrange
      const updateData = { permissionIds: [4, 5] };
      const mockUpdatedRole = createRoleFixture({ id: 1 });
      mockRolePermissionDeleteMany.mockResolvedValue({ count: 3 });
      mockUpdate.mockResolvedValue(mockUpdatedRole);

      // Act
      await roleRepository.updateRole(1, updateData);

      // Assert
      expect(mockRolePermissionDeleteMany).toHaveBeenCalledWith({
        where: { roleId: 1 },
      });
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          permissions: {
            create: [
              { permission: { connect: { id: 4 } } },
              { permission: { connect: { id: 5 } } },
            ],
          },
        }),
        include: expect.any(Object),
      });
    });
  });

  describe("deleteRole", () => {
    it("should soft delete role", async () => {
      // Arrange
      const mockDeletedRole = createRoleFixture({ id: 1, deleted: true });
      mockUpdate.mockResolvedValue(mockDeletedRole);

      // Act
      const result = await roleRepository.deleteRole(1);

      // Assert
      expect(result.deleted).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { deleted: true, deletedAt: expect.any(Date) },
      });
    });
  });

  describe("bulkDeleteRoles", () => {
    it("should soft delete multiple roles", async () => {
      // Arrange
      mockUpdateMany.mockResolvedValue({ count: 3 });

      // Act
      const result = await roleRepository.bulkDeleteRoles([1, 2, 3]);

      // Assert
      expect(result.deletedCount).toBe(3);
      expect(mockUpdateMany).toHaveBeenCalledWith({
        where: {
          id: { in: [1, 2, 3] },
          deleted: false,
        },
        data: { deleted: true, deletedAt: expect.any(Date) },
      });
    });

    it("should return 0 when no roles found", async () => {
      // Arrange
      mockUpdateMany.mockResolvedValue({ count: 0 });

      // Act
      const result = await roleRepository.bulkDeleteRoles([999]);

      // Assert
      expect(result.deletedCount).toBe(0);
    });
  });

  describe("findRoleWithPermissions", () => {
    it("should return role with permissions", async () => {
      // Arrange
      const mockRoleWithPermissions = {
        ...createRoleFixture({ id: 1 }),
        permissions: [
          { permission: { id: 1, name: "users:read" } },
          { permission: { id: 2, name: "users:write" } },
        ],
      };
      mockFindUnique.mockResolvedValue(mockRoleWithPermissions);

      // Act
      const result = await roleRepository.findRoleWithPermissions(1);

      // Assert
      expect(result).toEqual(mockRoleWithPermissions);
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: {
          permissions: { include: { permission: true } },
        },
      });
    });

    it("should return null when role does not exist", async () => {
      // Arrange
      mockFindUnique.mockResolvedValue(null);

      // Act
      const result = await roleRepository.findRoleWithPermissions(999);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe("assignPermissionsToRole", () => {
    it("should replace all permissions for role", async () => {
      // Arrange
      const mockRole = createRoleFixture({ id: 1 });
      mockRolePermissionDeleteMany.mockResolvedValue({ count: 2 });
      mockRolePermissionCreateMany.mockResolvedValue({ count: 3 });
      mockFindUnique.mockResolvedValue(mockRole);

      // Act
      const result = await roleRepository.assignPermissionsToRole(1, [3, 4, 5]);

      // Assert
      expect(mockRolePermissionDeleteMany).toHaveBeenCalledWith({
        where: { roleId: 1 },
      });
      expect(mockRolePermissionCreateMany).toHaveBeenCalledWith({
        data: [
          { roleId: 1, permissionId: 3 },
          { roleId: 1, permissionId: 4 },
          { roleId: 1, permissionId: 5 },
        ],
      });
      expect(result).toEqual(mockRole);
    });
  });

  describe("removePermissionsFromRole", () => {
    it("should remove specific permissions from role", async () => {
      // Arrange
      const mockRole = createRoleFixture({ id: 1 });
      mockRolePermissionDeleteMany.mockResolvedValue({ count: 2 });
      mockFindUnique.mockResolvedValue(mockRole);

      // Act
      const result = await roleRepository.removePermissionsFromRole(1, [2, 3]);

      // Assert
      expect(mockRolePermissionDeleteMany).toHaveBeenCalledWith({
        where: {
          roleId: 1,
          permissionId: { in: [2, 3] },
        },
      });
      expect(result).toEqual(mockRole);
    });
  });

  describe("getRolesWithPermissions", () => {
    it("should return paginated roles with permissions", async () => {
      // Arrange
      const mockRoles = [
        {
          ...createRoleFixture({ id: 1 }),
          permissions: [{ permission: { id: 1, name: "users:read" } }],
        },
      ];
      mockFindMany.mockResolvedValue(mockRoles);
      mockCount.mockResolvedValue(1);

      // Act
      const result = await roleRepository.getRolesWithPermissions({
        page: 1,
        limit: 10,
      });

      // Assert
      expect(result.data).toHaveLength(1);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            permissions: { include: { permission: true } },
          },
        }),
      );
    });
  });
});
