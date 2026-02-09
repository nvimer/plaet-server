import { Permission } from "@prisma/client";
import { PermissionService } from "../../permission.service";
import { PermissionRepositoryInterface } from "../../interfaces/permission.repository.interface";
import { createMockPermissionRepository } from "../helpers";
import { createPermissionFixture } from "../helpers/permission.fixtures";
import { CustomError } from "../../../../types/custom-errors";
import { HttpStatus } from "../../../../utils/httpStatus.enum";
import {
  PaginationParams,
  PaginatedResponse,
} from "../../../../interfaces/pagination.interfaces";
import {
  CreatePermissionInput,
  UpdatePermissionInput,
  BulkPermissionInput,
  PermissionSearchParams,
} from "../../permission.validator";

describe("PermissionService - Unit Tests", () => {
  let permissionService: PermissionService;
  let mockPermissionRepository: jest.Mocked<PermissionRepositoryInterface>;

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
    mockPermissionRepository = createMockPermissionRepository();
    permissionService = new PermissionService(mockPermissionRepository);
    jest.clearAllMocks();
  });

  describe("findAllPermissions", () => {
    it("should return paginated permissions when valid params provided", async () => {
      // Arrange
      const params: PaginationParams = { page: 1, limit: 10 };
      const permissions = [
        createPermissionFixture({ id: 1, name: "permission:read" }),
        createPermissionFixture({ id: 2, name: "permission:write" }),
      ];
      const expectedResponse = createPaginatedResponse(permissions);

      mockPermissionRepository.findAll.mockResolvedValue(expectedResponse);

      // Act
      const result = await permissionService.findAllPermissions(params);

      // Assert
      expect(mockPermissionRepository.findAll).toHaveBeenCalledWith(params);
      expect(result).toEqual(expectedResponse);
      expect(result.data).toHaveLength(2);
    });

    it("should return empty list when no permissions exist", async () => {
      // Arrange
      const params: PaginationParams = { page: 1, limit: 10 };
      const emptyResponse = createPaginatedResponse<Permission>([]);

      mockPermissionRepository.findAll.mockResolvedValue(emptyResponse);

      // Act
      const result = await permissionService.findAllPermissions(params);

      // Assert
      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });
  });

  describe("findPermissionById", () => {
    it("should return permission when found", async () => {
      // Arrange
      const id = 1;
      const permission = createPermissionFixture({ id });

      mockPermissionRepository.findById.mockResolvedValue(permission);

      // Act
      const result = await permissionService.findPermissionById(id);

      // Assert
      expect(mockPermissionRepository.findById).toHaveBeenCalledWith(id);
      expect(result).toEqual(permission);
    });

    it("should throw CustomError when permission not found", async () => {
      // Arrange
      const id = 999;
      mockPermissionRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(permissionService.findPermissionById(id)).rejects.toThrow(
        CustomError,
      );
      await expect(permissionService.findPermissionById(id)).rejects.toThrow(
        `Permission with ID ${id} not found`,
      );

      try {
        await permissionService.findPermissionById(id);
        fail("Expected error to be thrown");
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(CustomError);
        if (error instanceof CustomError) {
          expect(error.statusCode).toBe(404);
          expect(error.errorCode).toBe("PERMISSION_NOT_FOUND");
        }
      }
    });
  });

  describe("createPermission", () => {
    it("should create permission when valid data provided and name is unique", async () => {
      // Arrange
      const input: CreatePermissionInput = {
        name: "permission:new",
        description: "New permission description",
      };
      const created = createPermissionFixture(input);

      mockPermissionRepository.findByName.mockResolvedValue(null);
      mockPermissionRepository.create.mockResolvedValue(created);

      // Act
      const result = await permissionService.createPermission(input);

      // Assert
      expect(mockPermissionRepository.findByName).toHaveBeenCalledWith(
        input.name,
      );
      expect(mockPermissionRepository.create).toHaveBeenCalledWith(input);
      expect(result).toEqual(created);
    });

    it("should throw CustomError when permission name already exists", async () => {
      // Arrange
      const input: CreatePermissionInput = {
        name: "permission:existing",
        description: "Description",
      };
      const existing = createPermissionFixture({ name: input.name });

      mockPermissionRepository.findByName.mockResolvedValue(existing);

      // Act & Assert
      await expect(permissionService.createPermission(input)).rejects.toThrow(
        CustomError,
      );
      await expect(permissionService.createPermission(input)).rejects.toThrow(
        `A permission with the name '${input.name}' already exists`,
      );

      try {
        await permissionService.createPermission(input);
        fail("Expected error to be thrown");
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(CustomError);
        if (error instanceof CustomError) {
          expect(error.statusCode).toBe(HttpStatus.CONFLICT);
          expect(error.errorCode).toBe("DUPLICATE_PERMISSION_NAME");
        }
      }

      expect(mockPermissionRepository.create).not.toHaveBeenCalled();
    });
  });

  describe("updatePermission", () => {
    it("should update permission when valid data provided and permission exists", async () => {
      // Arrange
      const id = 1;
      const input: UpdatePermissionInput = {
        name: "permission:updated",
        description: "Updated description",
      };
      const existing = createPermissionFixture({ id });
      const updated = createPermissionFixture({ id, ...input });

      mockPermissionRepository.findById.mockResolvedValue(existing);
      mockPermissionRepository.findByName.mockResolvedValue(null);
      mockPermissionRepository.update.mockResolvedValue(updated);

      // Act
      const result = await permissionService.updatePermission(id, input);

      // Assert
      expect(mockPermissionRepository.findById).toHaveBeenCalledWith(id);
      expect(mockPermissionRepository.update).toHaveBeenCalledWith(id, input);
      expect(result).toEqual(updated);
    });

    it("should throw CustomError when permission not found", async () => {
      // Arrange
      const id = 999;
      const input: UpdatePermissionInput = { name: "permission:updated" };

      mockPermissionRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        permissionService.updatePermission(id, input),
      ).rejects.toThrow(CustomError);
      await expect(
        permissionService.updatePermission(id, input),
      ).rejects.toThrow(`Permission with ID ${id} not found`);

      expect(mockPermissionRepository.update).not.toHaveBeenCalled();
    });

    it("should throw CustomError when updated name conflicts with existing permission", async () => {
      // Arrange
      const id = 1;
      const input: UpdatePermissionInput = {
        name: "permission:conflicting",
      };
      const existing = createPermissionFixture({ id });
      const conflicting = createPermissionFixture({
        id: 2,
        name: input.name,
      });

      mockPermissionRepository.findById.mockResolvedValue(existing);
      mockPermissionRepository.findByName.mockResolvedValue(conflicting);

      // Act & Assert
      await expect(
        permissionService.updatePermission(id, input),
      ).rejects.toThrow(CustomError);
      await expect(
        permissionService.updatePermission(id, input),
      ).rejects.toThrow(
        `A permission with the name '${input.name}' already exists`,
      );

      // Reset mocks for second assertion
      mockPermissionRepository.findById.mockResolvedValue(existing);
      mockPermissionRepository.findByName.mockResolvedValue(conflicting);

      const error = await permissionService
        .updatePermission(id, input)
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(CustomError);
      if (error instanceof CustomError) {
        expect(error.statusCode).toBe(HttpStatus.CONFLICT);
        expect(error.errorCode).toBe("DUPLICATE_PERMISSION_NAME");
      }

      expect(mockPermissionRepository.update).not.toHaveBeenCalled();
    });

    it("should allow updating name to same name for same permission", async () => {
      // Arrange
      const id = 1;
      const input: UpdatePermissionInput = {
        name: "permission:same",
      };
      const existing = createPermissionFixture({ id, name: input.name });
      const updated = createPermissionFixture({ id, ...input });

      mockPermissionRepository.findById.mockResolvedValue(existing);
      mockPermissionRepository.findByName.mockResolvedValue(existing);
      mockPermissionRepository.update.mockResolvedValue(updated);

      // Act
      const result = await permissionService.updatePermission(id, input);

      // Assert
      expect(mockPermissionRepository.update).toHaveBeenCalledWith(id, input);
      expect(result).toEqual(updated);
    });

    it("should update permission without checking name when name is not provided", async () => {
      // Arrange
      const id = 1;
      const input: UpdatePermissionInput = {
        description: "Updated description only",
      };
      const existing = createPermissionFixture({ id });
      const updated = createPermissionFixture({ id, ...input });

      mockPermissionRepository.findById.mockResolvedValue(existing);
      mockPermissionRepository.update.mockResolvedValue(updated);

      // Act
      const result = await permissionService.updatePermission(id, input);

      // Assert
      expect(mockPermissionRepository.findByName).not.toHaveBeenCalled();
      expect(mockPermissionRepository.update).toHaveBeenCalledWith(id, input);
      expect(result).toEqual(updated);
    });
  });

  describe("deletePermission", () => {
    it("should delete permission when permission exists", async () => {
      // Arrange
      const id = 1;
      const permission = createPermissionFixture({ id });

      mockPermissionRepository.findById.mockResolvedValue(permission);
      mockPermissionRepository.delete.mockResolvedValue(permission);

      // Act
      const result = await permissionService.deletePermission(id);

      // Assert
      expect(mockPermissionRepository.findById).toHaveBeenCalledWith(id);
      expect(mockPermissionRepository.delete).toHaveBeenCalledWith(id);
      expect(result).toEqual(permission);
    });

    it("should throw CustomError when permission not found", async () => {
      // Arrange
      const id = 999;

      mockPermissionRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(permissionService.deletePermission(id)).rejects.toThrow(
        CustomError,
      );
      await expect(permissionService.deletePermission(id)).rejects.toThrow(
        `Permission with ID ${id} not found`,
      );

      expect(mockPermissionRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe("bulkDeletePermissions", () => {
    it("should delete multiple permissions when all exist", async () => {
      // Arrange
      const input: BulkPermissionInput = { ids: [1, 2, 3] };
      const permissions = input.ids.map((id) =>
        createPermissionFixture({ id }),
      );

      mockPermissionRepository.findById
        .mockResolvedValueOnce(permissions[0])
        .mockResolvedValueOnce(permissions[1])
        .mockResolvedValueOnce(permissions[2]);
      mockPermissionRepository.bulkDelete.mockResolvedValue(3);

      // Act
      const result = await permissionService.bulkDeletePermissions(input);

      // Assert
      expect(mockPermissionRepository.findById).toHaveBeenCalledTimes(3);
      expect(mockPermissionRepository.bulkDelete).toHaveBeenCalledWith(
        input.ids,
      );
      expect(result).toBe(3);
    });

    it("should throw CustomError when any permission not found", async () => {
      // Arrange
      const input: BulkPermissionInput = { ids: [1, 999] };
      const permission1 = createPermissionFixture({ id: 1 });

      // Mock findById for each ID check in the loop
      // First iteration: id=1 (found)
      // Second iteration: id=999 (not found) - should throw
      mockPermissionRepository.findById
        .mockResolvedValueOnce(permission1) // First check: id=1
        .mockResolvedValueOnce(null); // Second check: id=999 (not found)

      // Act & Assert
      try {
        await permissionService.bulkDeletePermissions(input);
        fail("Expected error to be thrown");
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(CustomError);
        if (error instanceof CustomError) {
          expect(error.message).toContain("Permission with ID 999 not found");
        }
      }

      expect(mockPermissionRepository.bulkDelete).not.toHaveBeenCalled();
    });
  });

  describe("searchPermissions", () => {
    it("should return paginated search results when valid params provided", async () => {
      // Arrange
      const params: PaginationParams & PermissionSearchParams = {
        page: 1,
        limit: 10,
        search: "read",
      };
      const permissions = [
        createPermissionFixture({ id: 1, name: "permission:read" }),
        createPermissionFixture({ id: 2, name: "permission:read:all" }),
      ];
      const expectedResponse = createPaginatedResponse(permissions);

      mockPermissionRepository.search.mockResolvedValue(expectedResponse);

      // Act
      const result = await permissionService.searchPermissions(params);

      // Assert
      expect(mockPermissionRepository.search).toHaveBeenCalledWith(params);
      expect(result).toEqual(expectedResponse);
    });

    it("should return empty list when no matches found", async () => {
      // Arrange
      const params: PaginationParams & PermissionSearchParams = {
        page: 1,
        limit: 10,
        search: "nonexistent",
      };
      const emptyResponse = createPaginatedResponse<Permission>([]);

      mockPermissionRepository.search.mockResolvedValue(emptyResponse);

      // Act
      const result = await permissionService.searchPermissions(params);

      // Assert
      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });
  });
});
