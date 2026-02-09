import { MenuCategory } from "@prisma/client";
import { CategoryService } from "../../category.service";
import { CategoryRepositoryInterface } from "../../interfaces/category.repository.interface";
import { createMockCategoryRepository } from "../helpers";
import { createCategoryFixture } from "../helpers/category.fixtures";
import { CustomError } from "../../../../../types/custom-errors";
import { HttpStatus } from "../../../../../utils/httpStatus.enum";
import {
  PaginationParams,
  PaginatedResponse,
} from "../../../../../interfaces/pagination.interfaces";
import {
  CreateMenuCategoryInput,
  UpdateMenuCategoryInput,
  BulkCategoryInput,
  CategorySearchParams,
} from "../../category.validator";

describe("CategoryService - Unit Tests", () => {
  let categoryService: CategoryService;
  let mockCategoryRepository: jest.Mocked<CategoryRepositoryInterface>;

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
    mockCategoryRepository = createMockCategoryRepository();
    categoryService = new CategoryService(mockCategoryRepository);
    jest.clearAllMocks();
  });

  describe("findCategories", () => {
    it("should return paginated categories when valid params provided", async () => {
      // Arrange
      const params: PaginationParams = { page: 1, limit: 10 };
      const categories = [
        createCategoryFixture({ id: 1, name: "Category 1" }),
        createCategoryFixture({ id: 2, name: "Category 2" }),
      ];
      const expectedResponse = createPaginatedResponse(categories);

      mockCategoryRepository.findAll.mockResolvedValue(expectedResponse);

      // Act
      const result = await categoryService.findCategories(params);

      // Assert
      expect(mockCategoryRepository.findAll).toHaveBeenCalledWith(params);
      expect(result).toEqual(expectedResponse);
      expect(result.data).toHaveLength(2);
    });

    it("should return empty list when no categories exist", async () => {
      // Arrange
      const params: PaginationParams = { page: 1, limit: 10 };
      const emptyResponse = createPaginatedResponse<MenuCategory>([]);

      mockCategoryRepository.findAll.mockResolvedValue(emptyResponse);

      // Act
      const result = await categoryService.findCategories(params);

      // Assert
      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });
  });

  describe("findCategoryById", () => {
    it("should return category when found", async () => {
      // Arrange
      const id = 1;
      const category = createCategoryFixture({ id });

      mockCategoryRepository.findById.mockResolvedValue(category);

      // Act
      const result = await categoryService.findCategoryById(id);

      // Assert
      expect(mockCategoryRepository.findById).toHaveBeenCalledWith(id);
      expect(result).toEqual(category);
    });

    it("should throw CustomError when category not found", async () => {
      // Arrange
      const id = 999;
      mockCategoryRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(categoryService.findCategoryById(id)).rejects.toThrow(
        CustomError,
      );
      await expect(categoryService.findCategoryById(id)).rejects.toThrow(
        `Menu Category ID ${id} not found`,
      );

      try {
        await categoryService.findCategoryById(id);
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

  describe("createCategory", () => {
    it("should create category when valid data provided and name is unique", async () => {
      // Arrange
      const input: CreateMenuCategoryInput = {
        name: "New Category",
        description: "Category description",
        order: 1,
      };
      const created = createCategoryFixture(input);

      mockCategoryRepository.findByName.mockResolvedValue(null);
      mockCategoryRepository.create.mockResolvedValue(created);

      // Act
      const result = await categoryService.createCategory(input);

      // Assert
      expect(mockCategoryRepository.findByName).toHaveBeenCalledWith(
        input.name,
      );
      expect(mockCategoryRepository.create).toHaveBeenCalledWith(input);
      expect(result).toEqual(created);
    });

    it("should throw CustomError when category name already exists", async () => {
      // Arrange
      const input: CreateMenuCategoryInput = {
        name: "Existing Category",
        description: "Description",
        order: 1,
      };
      const existing = createCategoryFixture({ name: input.name });

      mockCategoryRepository.findByName.mockResolvedValue(existing);

      // Act & Assert
      await expect(categoryService.createCategory(input)).rejects.toThrow(
        CustomError,
      );
      await expect(categoryService.createCategory(input)).rejects.toThrow(
        `Category with name "${input.name}" already exists`,
      );

      try {
        await categoryService.createCategory(input);
        fail("Expected error to be thrown");
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(CustomError);
        if (error instanceof CustomError) {
          expect(error.statusCode).toBe(HttpStatus.CONFLICT);
          expect(error.errorCode).toBe("DUPLICATE_NAME");
        }
      }

      expect(mockCategoryRepository.create).not.toHaveBeenCalled();
    });
  });

  describe("updateCategory", () => {
    it("should update category when valid data provided and category exists", async () => {
      // Arrange
      const id = 1;
      const input: UpdateMenuCategoryInput = {
        name: "Updated Category",
        description: "Updated description",
      };
      const existing = createCategoryFixture({ id });
      const updated = createCategoryFixture({ id, ...input });

      mockCategoryRepository.findById.mockResolvedValue(existing);
      mockCategoryRepository.findByName.mockResolvedValue(null);
      mockCategoryRepository.update.mockResolvedValue(updated);

      // Act
      const result = await categoryService.updateCategory(id, input);

      // Assert
      expect(mockCategoryRepository.findById).toHaveBeenCalledWith(id);
      expect(mockCategoryRepository.update).toHaveBeenCalledWith(id, input);
      expect(result).toEqual(updated);
    });

    it("should throw CustomError when category not found", async () => {
      // Arrange
      const id = 999;
      const input: UpdateMenuCategoryInput = { name: "Updated Name" };

      mockCategoryRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(categoryService.updateCategory(id, input)).rejects.toThrow(
        CustomError,
      );
      await expect(categoryService.updateCategory(id, input)).rejects.toThrow(
        `Menu Category ID ${id} not found`,
      );

      expect(mockCategoryRepository.update).not.toHaveBeenCalled();
    });

    it("should throw CustomError when updated name conflicts with existing category", async () => {
      // Arrange
      const id = 1;
      const input: UpdateMenuCategoryInput = {
        name: "Conflicting Name",
      };
      const existing = createCategoryFixture({ id });
      const conflicting = createCategoryFixture({
        id: 2,
        name: input.name,
      });

      mockCategoryRepository.findById.mockResolvedValue(existing);
      mockCategoryRepository.findByName.mockResolvedValue(conflicting);

      // Act & Assert
      await expect(categoryService.updateCategory(id, input)).rejects.toThrow(
        CustomError,
      );
      await expect(categoryService.updateCategory(id, input)).rejects.toThrow(
        `Category with name "${input.name}" already exists`,
      );

      try {
        await categoryService.updateCategory(id, input);
        fail("Expected error to be thrown");
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(CustomError);
        if (error instanceof CustomError) {
          expect(error.statusCode).toBe(HttpStatus.CONFLICT);
          expect(error.errorCode).toBe("DUPLICATE_NAME");
        }
      }

      expect(mockCategoryRepository.update).not.toHaveBeenCalled();
    });

    it("should allow updating name to same name for same category", async () => {
      // Arrange
      const id = 1;
      const input: UpdateMenuCategoryInput = {
        name: "Same Name",
      };
      const existing = createCategoryFixture({ id, name: input.name });
      const updated = createCategoryFixture({ id, ...input });

      mockCategoryRepository.findById.mockResolvedValue(existing);
      mockCategoryRepository.findByName.mockResolvedValue(existing);
      mockCategoryRepository.update.mockResolvedValue(updated);

      // Act
      const result = await categoryService.updateCategory(id, input);

      // Assert
      expect(mockCategoryRepository.update).toHaveBeenCalledWith(id, input);
      expect(result).toEqual(updated);
    });
  });

  describe("deleteCategory", () => {
    it("should delete category when category exists and not deleted", async () => {
      // Arrange
      const id = 1;
      const category = createCategoryFixture({ id, deleted: false });

      mockCategoryRepository.findById.mockResolvedValue(category);
      mockCategoryRepository.delete.mockResolvedValue(category);

      // Act
      const result = await categoryService.deleteCategory(id);

      // Assert
      expect(mockCategoryRepository.findById).toHaveBeenCalledWith(id);
      expect(mockCategoryRepository.delete).toHaveBeenCalledWith(id);
      expect(result).toEqual(category);
    });

    it("should throw CustomError when category not found", async () => {
      // Arrange
      const id = 999;

      mockCategoryRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(categoryService.deleteCategory(id)).rejects.toThrow(
        CustomError,
      );
      await expect(categoryService.deleteCategory(id)).rejects.toThrow(
        `Menu Category ID ${id} not found`,
      );

      expect(mockCategoryRepository.delete).not.toHaveBeenCalled();
    });

    it("should throw CustomError when category is already deleted", async () => {
      // Arrange
      const id = 1;
      const deletedCategory = createCategoryFixture({
        id,
        deleted: true,
        deletedAt: new Date(),
      });

      mockCategoryRepository.findById.mockResolvedValue(deletedCategory);

      // Act & Assert
      await expect(categoryService.deleteCategory(id)).rejects.toThrow(
        CustomError,
      );
      await expect(categoryService.deleteCategory(id)).rejects.toThrow(
        `Menu Category ID ${id} is already deleted`,
      );

      try {
        await categoryService.deleteCategory(id);
        fail("Expected error to be thrown");
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(CustomError);
        if (error instanceof CustomError) {
          expect(error.statusCode).toBe(HttpStatus.BAD_REQUEST);
          expect(error.errorCode).toBe("ALREADY_DELETED");
        }
      }

      expect(mockCategoryRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe("bulkDeleteCategories", () => {
    it("should delete multiple categories when all exist", async () => {
      // Arrange
      const input: BulkCategoryInput = { ids: [1, 2, 3] };

      mockCategoryRepository.bulkDelete.mockResolvedValue(3);

      // Act
      const result = await categoryService.bulkDeleteCategories(input);

      // Assert
      expect(mockCategoryRepository.bulkDelete).toHaveBeenCalledWith(input.ids);
      expect(result).toBe(3);
    });

    it("should throw CustomError when no IDs provided", async () => {
      // Arrange
      const input: BulkCategoryInput = { ids: [] };

      // Act & Assert
      await expect(categoryService.bulkDeleteCategories(input)).rejects.toThrow(
        CustomError,
      );
      await expect(categoryService.bulkDeleteCategories(input)).rejects.toThrow(
        "At least one category ID must be provided for bulk deletion",
      );

      try {
        await categoryService.bulkDeleteCategories(input);
        fail("Expected error to be thrown");
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(CustomError);
        if (error instanceof CustomError) {
          expect(error.statusCode).toBe(HttpStatus.BAD_REQUEST);
          expect(error.errorCode).toBe("INVALID_INPUT");
        }
      }

      expect(mockCategoryRepository.bulkDelete).not.toHaveBeenCalled();
    });
  });

  describe("searchCategories", () => {
    it("should return paginated search results when valid params provided", async () => {
      // Arrange
      const params: PaginationParams & CategorySearchParams = {
        page: 1,
        limit: 10,
        search: "test",
        active: true,
      };
      const categories = [
        createCategoryFixture({ id: 1, name: "Test Category 1" }),
        createCategoryFixture({ id: 2, name: "Test Category 2" }),
      ];
      const expectedResponse = createPaginatedResponse(categories);

      mockCategoryRepository.search.mockResolvedValue(expectedResponse);

      // Act
      const result = await categoryService.searchCategories(params);

      // Assert
      expect(mockCategoryRepository.search).toHaveBeenCalledWith(params);
      expect(result).toEqual(expectedResponse);
    });

    it("should return empty list when no matches found", async () => {
      // Arrange
      const params: PaginationParams & CategorySearchParams = {
        page: 1,
        limit: 10,
        search: "nonexistent",
      };
      const emptyResponse = createPaginatedResponse<MenuCategory>([]);

      mockCategoryRepository.search.mockResolvedValue(emptyResponse);

      // Act
      const result = await categoryService.searchCategories(params);

      // Assert
      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });
  });
});
