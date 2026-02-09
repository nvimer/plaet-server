import { Role, RoleName } from "@prisma/client";
import { RoleService } from "../../role.service";
import { RoleRepositoryInterface } from "../../interfaces/role.repository.interface";
import { createMockRoleRepository } from "../helpers";
import { createRoleFixture } from "../helpers/role.fixtures";
import { CustomError } from "../../../../types/custom-errors";
import { HttpStatus } from "../../../../utils/httpStatus.enum";
import {
  PaginationParams,
  PaginatedResponse,
} from "../../../../interfaces/pagination.interfaces";
import { CreateRoleInput, UpdateRoleInput } from "../../role.validator";

describe("RoleService - Unit Tests", () => {
  let roleService: RoleService;
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
    roleService = new RoleService(mockRoleRepository);
    jest.clearAllMocks();
  });

  describe("findAll", () => {
    it("should return paginated roles when valid params provided", async () => {
      // Arrange
      const params: PaginationParams = { page: 1, limit: 10 };
      const roles = [
        createRoleFixture({ id: 1, name: RoleName.ADMIN }),
        createRoleFixture({ id: 2, name: RoleName.WAITER }),
      ];
      const expectedResponse = createPaginatedResponse(roles);

      mockRoleRepository.findAll.mockResolvedValue(expectedResponse);

      // Act
      const result = await roleService.findAll(params);

      // Assert
      expect(mockRoleRepository.findAll).toHaveBeenCalledWith(params);
      expect(result).toEqual(expectedResponse);
      expect(result.data).toHaveLength(2);
    });

    it("should return empty list when no roles exist", async () => {
      // Arrange
      const params: PaginationParams = { page: 1, limit: 10 };
      const emptyResponse = createPaginatedResponse<Role>([]);

      mockRoleRepository.findAll.mockResolvedValue(emptyResponse);

      // Act
      const result = await roleService.findAll(params);

      // Assert
      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });
  });

  describe("searchRoles", () => {
    it("should return paginated search results when valid params provided", async () => {
      // Arrange
      const params: PaginationParams = { page: 1, limit: 10 };
      const search = "admin";
      const active = true;
      const roles = [
        createRoleFixture({ id: 1, name: "ADMIN" }),
        createRoleFixture({ id: 2, name: RoleName.CASHIER }),
      ];
      const expectedResponse = createPaginatedResponse(roles);

      mockRoleRepository.searchRoles.mockResolvedValue(expectedResponse);

      // Act
      const result = await roleService.searchRoles(params, search, active);

      // Assert
      expect(mockRoleRepository.searchRoles).toHaveBeenCalledWith(
        params,
        search,
        active,
      );
      expect(result).toEqual(expectedResponse);
    });

    it("should return empty list when no matches found", async () => {
      // Arrange
      const params: PaginationParams = { page: 1, limit: 10 };
      const search = "nonexistent";
      const emptyResponse = createPaginatedResponse<Role>([]);

      mockRoleRepository.searchRoles.mockResolvedValue(emptyResponse);

      // Act
      const result = await roleService.searchRoles(params, search, undefined);

      // Assert
      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });
  });

  describe("findById", () => {
    it("should return role when found", async () => {
      // Arrange
      const id = 1;
      const role = createRoleFixture({ id });

      mockRoleRepository.findById.mockResolvedValue(role);

      // Act
      const result = await roleService.findById(id);

      // Assert
      expect(mockRoleRepository.findById).toHaveBeenCalledWith(id);
      expect(result).toEqual(role);
    });

    it("should throw CustomError when role not found", async () => {
      // Arrange
      const id = 999;
      mockRoleRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(roleService.findById(id)).rejects.toThrow(CustomError);
      await expect(roleService.findById(id)).rejects.toThrow(
        `Role with ID ${id} not found.`,
      );

      try {
        await roleService.findById(id);
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

  describe("createRole", () => {
    it("should create role when valid data provided", async () => {
      // Arrange
      const input: CreateRoleInput = {
        name: RoleName.ADMIN,
        description: "New role description",
        permissionIds: [],
      };
      const created = createRoleFixture(input);

      mockRoleRepository.createRole.mockResolvedValue(created);

      // Act
      const result = await roleService.createRole(input);

      // Assert
      expect(mockRoleRepository.createRole).toHaveBeenCalledWith(input);
      expect(result).toEqual(created);
    });
  });

  describe("updateRole", () => {
    it("should update role when valid data provided and role exists", async () => {
      // Arrange
      const id = 1;
      const input: UpdateRoleInput = {
        name: RoleName.WAITER,
        description: "Updated description",
      };
      const existing = createRoleFixture({ id });
      const updated = createRoleFixture({ id, ...input });

      mockRoleRepository.findById.mockResolvedValue(existing);
      mockRoleRepository.updateRole.mockResolvedValue(updated);

      // Act
      const result = await roleService.updateRole(id, input);

      // Assert
      expect(mockRoleRepository.findById).toHaveBeenCalledWith(id);
      expect(mockRoleRepository.updateRole).toHaveBeenCalledWith(id, input);
      expect(result).toEqual(updated);
    });

    it("should throw CustomError when role not found", async () => {
      // Arrange
      const id = 999;
      const input: UpdateRoleInput = { name: RoleName.WAITER };

      mockRoleRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(roleService.updateRole(id, input)).rejects.toThrow(
        CustomError,
      );
      await expect(roleService.updateRole(id, input)).rejects.toThrow(
        `Role with ID ${id} not found.`,
      );

      expect(mockRoleRepository.updateRole).not.toHaveBeenCalled();
    });

    it("should update role description without name", async () => {
      // Arrange
      const id = 1;
      const input: UpdateRoleInput = {
        description: "Updated description only",
      };
      const existing = createRoleFixture({ id });
      const updated = createRoleFixture({ id, ...input });

      mockRoleRepository.findById.mockResolvedValue(existing);
      mockRoleRepository.updateRole.mockResolvedValue(updated);

      // Act
      const result = await roleService.updateRole(id, input);

      // Assert
      expect(mockRoleRepository.updateRole).toHaveBeenCalledWith(id, input);
      expect(result).toEqual(updated);
    });
  });

  describe("deleteRole", () => {
    it("should delete role when role exists", async () => {
      // Arrange
      const id = 1;
      const role = createRoleFixture({ id });

      mockRoleRepository.findById.mockResolvedValue(role);
      mockRoleRepository.deleteRole.mockResolvedValue(role);

      // Act
      const result = await roleService.deleteRole(id);

      // Assert
      expect(mockRoleRepository.findById).toHaveBeenCalledWith(id);
      expect(mockRoleRepository.deleteRole).toHaveBeenCalledWith(id);
      expect(result).toEqual(role);
    });

    it("should throw CustomError when role not found", async () => {
      // Arrange
      const id = 999;

      mockRoleRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(roleService.deleteRole(id)).rejects.toThrow(CustomError);
      await expect(roleService.deleteRole(id)).rejects.toThrow(
        `Role with ID ${id} not found.`,
      );

      expect(mockRoleRepository.deleteRole).not.toHaveBeenCalled();
    });
  });

  describe("bulkDeleteRoles", () => {
    it("should delete multiple roles when valid IDs provided", async () => {
      // Arrange
      const ids = [1, 2, 3];

      mockRoleRepository.bulkDeleteRoles.mockResolvedValue({
        deletedCount: 3,
      });

      // Act
      const result = await roleService.bulkDeleteRoles(ids);

      // Assert
      expect(mockRoleRepository.bulkDeleteRoles).toHaveBeenCalledWith(ids);
      expect(result).toEqual({ deletedCount: 3 });
    });

    it("should return deletedCount of 0 when no roles deleted", async () => {
      // Arrange
      const ids = [999, 998];

      mockRoleRepository.bulkDeleteRoles.mockResolvedValue({
        deletedCount: 0,
      });

      // Act
      const result = await roleService.bulkDeleteRoles(ids);

      // Assert
      expect(mockRoleRepository.bulkDeleteRoles).toHaveBeenCalledWith(ids);
      expect(result).toEqual({ deletedCount: 0 });
    });
  });
});
