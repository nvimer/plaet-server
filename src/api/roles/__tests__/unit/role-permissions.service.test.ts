import { Role } from "@prisma/client";
import { RolePermissionService } from "../../role-permissions.service";
import { RoleRepositoryInterface } from "../../interfaces/role.repository.interface";
import { createMockRoleRepository } from "../helpers";
import {
  createRoleFixture,
  createRoleWithPermissionsFixture,
} from "../helpers/role.fixtures";
import { CustomError } from "../../../../types/custom-errors";
import { HttpStatus } from "../../../../utils/httpStatus.enum";
import {
  PaginationParams,
  PaginatedResponse,
} from "../../../../interfaces/pagination.interfaces";

describe("RolePermissionService - Unit Tests", () => {
  let rolePermissionService: RolePermissionService;
  let mockRoleRepository: jest.Mocked<RoleRepositoryInterface>;

  const createPaginatedResponse = <T>(
    data: T[],
    overrides: Partial<PaginatedResponse<T>["meta"]> = {},
  ): PaginatedResponse<T> => ({
    data,
    meta: {
      total: data.length,
      page: 1,
      limit: 10,
      totalPages: Math.ceil(data.length / 10) || 1,
      hasNextPage: false,
      hasPreviousPage: false,
      ...overrides,
    },
  });

  beforeEach(() => {
    mockRoleRepository = createMockRoleRepository();
    rolePermissionService = new RolePermissionService(mockRoleRepository);
    jest.clearAllMocks();
  });

  describe("findRoleWithPermissions", () => {
    it("should return role with permissions when role exists", async () => {
      // Arrange
      const id = 1;
      const roleWithPermissions = createRoleWithPermissionsFixture({ id }, [
        { id: 1, name: "permission:read" },
        { id: 2, name: "permission:write" },
      ]);

      mockRoleRepository.findRoleWithPermissions.mockResolvedValue(
        roleWithPermissions as Role,
      );

      // Act
      const result = await rolePermissionService.findRoleWithPermissions(id);

      // Assert
      expect(mockRoleRepository.findRoleWithPermissions).toHaveBeenCalledWith(
        id,
      );
      expect(result).toEqual(roleWithPermissions);
    });

    it("should throw CustomError when role not found", async () => {
      // Arrange
      const id = 999;
      mockRoleRepository.findRoleWithPermissions.mockResolvedValue(null);

      // Act & Assert
      await expect(
        rolePermissionService.findRoleWithPermissions(id),
      ).rejects.toThrow(CustomError);
      await expect(
        rolePermissionService.findRoleWithPermissions(id),
      ).rejects.toThrow(`Role with ID ${id} not found.`);

      try {
        await rolePermissionService.findRoleWithPermissions(id);
        fail("Expected error to be thrown");
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(CustomError);
        if (error instanceof CustomError) {
          expect(error.statusCode).toBe(HttpStatus.NOT_FOUND);
          expect(error.errorCode).toBe("ID_NOT_FOUND");
        }
      }
    });
  });

  describe("assignPermissionsToRole", () => {
    it("should assign permissions to role when role exists", async () => {
      // Arrange
      const roleId = 1;
      const permissionIds = [1, 2, 3];
      const roleWithPermissions = createRoleWithPermissionsFixture(
        { id: roleId },
        permissionIds.map((id) => ({ id, name: `permission:${id}` })),
      );

      mockRoleRepository.findRoleWithPermissions.mockResolvedValue(
        createRoleFixture({ id: roleId }) as Role,
      );
      mockRoleRepository.assignPermissionsToRole.mockResolvedValue(
        roleWithPermissions as Role,
      );

      // Act
      const result = await rolePermissionService.assignPermissionsToRole(
        roleId,
        permissionIds,
      );

      // Assert
      expect(mockRoleRepository.findRoleWithPermissions).toHaveBeenCalledWith(
        roleId,
      );
      expect(mockRoleRepository.assignPermissionsToRole).toHaveBeenCalledWith(
        roleId,
        permissionIds,
      );
      expect(result).toEqual(roleWithPermissions);
    });

    it("should throw CustomError when role not found", async () => {
      // Arrange
      const roleId = 999;
      const permissionIds = [1, 2];

      mockRoleRepository.findRoleWithPermissions.mockResolvedValue(null);

      // Act & Assert
      await expect(
        rolePermissionService.assignPermissionsToRole(roleId, permissionIds),
      ).rejects.toThrow(CustomError);
      await expect(
        rolePermissionService.assignPermissionsToRole(roleId, permissionIds),
      ).rejects.toThrow(`Role with ID ${roleId} not found.`);

      expect(mockRoleRepository.assignPermissionsToRole).not.toHaveBeenCalled();
    });
  });

  describe("removePermissionsFromRole", () => {
    it("should remove permissions from role when role exists", async () => {
      // Arrange
      const roleId = 1;
      const permissionIds = [2, 3];
      const roleWithRemovedPermissions = createRoleWithPermissionsFixture(
        { id: roleId },
        [{ id: 1, name: "permission:read" }],
      );

      mockRoleRepository.findRoleWithPermissions.mockResolvedValue(
        createRoleFixture({ id: roleId }) as Role,
      );
      mockRoleRepository.removePermissionsFromRole.mockResolvedValue(
        roleWithRemovedPermissions as Role,
      );

      // Act
      const result = await rolePermissionService.removePermissionsFromRole(
        roleId,
        permissionIds,
      );

      // Assert
      expect(mockRoleRepository.findRoleWithPermissions).toHaveBeenCalledWith(
        roleId,
      );
      expect(mockRoleRepository.removePermissionsFromRole).toHaveBeenCalledWith(
        roleId,
        permissionIds,
      );
      expect(result).toEqual(roleWithRemovedPermissions);
    });

    it("should throw CustomError when role not found", async () => {
      // Arrange
      const roleId = 999;
      const permissionIds = [1, 2];

      mockRoleRepository.findRoleWithPermissions.mockResolvedValue(null);

      // Act & Assert
      await expect(
        rolePermissionService.removePermissionsFromRole(roleId, permissionIds),
      ).rejects.toThrow(CustomError);
      await expect(
        rolePermissionService.removePermissionsFromRole(roleId, permissionIds),
      ).rejects.toThrow(`Role with ID ${roleId} not found.`);

      expect(
        mockRoleRepository.removePermissionsFromRole,
      ).not.toHaveBeenCalled();
    });
  });

  describe("getRolesWithPermissions", () => {
    it("should return paginated roles with permissions when valid params provided", async () => {
      // Arrange
      const params: PaginationParams = { page: 1, limit: 10 };
      const roles = [
        createRoleWithPermissionsFixture({ id: 1 }, [
          { id: 1, name: "permission:read" },
        ]),
        createRoleWithPermissionsFixture({ id: 2 }, [
          { id: 2, name: "permission:write" },
        ]),
      ];
      const expectedResponse = createPaginatedResponse(roles);

      mockRoleRepository.getRolesWithPermissions.mockResolvedValue(
        expectedResponse,
      );

      // Act
      const result =
        await rolePermissionService.getRolesWithPermissions(params);

      // Assert
      expect(mockRoleRepository.getRolesWithPermissions).toHaveBeenCalledWith(
        params,
      );
      expect(result).toEqual(expectedResponse);
      expect(result.data).toHaveLength(2);
    });

    it("should return empty list when no roles exist", async () => {
      // Arrange
      const params: PaginationParams = { page: 1, limit: 10 };
      const emptyResponse = createPaginatedResponse<Role>([]);

      mockRoleRepository.getRolesWithPermissions.mockResolvedValue(
        emptyResponse,
      );

      // Act
      const result =
        await rolePermissionService.getRolesWithPermissions(params);

      // Assert
      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });
  });
});
