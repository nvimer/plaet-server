// Create mock functions
const mockFindMany = jest.fn();
const mockFindUnique = jest.fn();
const mockFindFirst = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockUpdateMany = jest.fn();
const mockCount = jest.fn();

// Mock Prisma
jest.mock("../../../../../database/prisma", () => ({
  __esModule: true,
  default: {
    menuCategory: {
      findMany: mockFindMany,
      findUnique: mockFindUnique,
      findFirst: mockFindFirst,
      create: mockCreate,
      update: mockUpdate,
      updateMany: mockUpdateMany,
      count: mockCount,
    },
  },
}));

// Mock pagination helper
jest.mock("../../../../../utils/pagination.helper", () => ({
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

import categoryRepository from "../../category.repository";
import { createCategoryFixture } from "../helpers";

describe("CategoryRepository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("findAll", () => {
    it("should return paginated categories", async () => {
      // Arrange
      const mockCategories = [
        createCategoryFixture({ id: 1, name: "Main Dishes" }),
        createCategoryFixture({ id: 2, name: "Desserts" }),
      ];
      mockFindMany.mockResolvedValue(mockCategories);
      mockCount.mockResolvedValue(2);

      // Act
      const result = await categoryRepository.findAll({ page: 1, limit: 10 });

      // Assert
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
    });

    it("should calculate skip correctly for pagination", async () => {
      // Arrange
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(50);

      // Act
      await categoryRepository.findAll({ page: 3, limit: 10 });

      // Assert
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        }),
      );
    });

    it("should filter out deleted categories", async () => {
      // Arrange
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      // Act
      await categoryRepository.findAll({ page: 1, limit: 10 });

      // Assert
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deleted: false },
        }),
      );
    });

    it("should order by order field then name", async () => {
      // Arrange
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      // Act
      await categoryRepository.findAll({ page: 1, limit: 10 });

      // Assert
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ order: "asc" }, { name: "asc" }],
        }),
      );
    });
  });

  describe("findById", () => {
    it("should return category when id exists", async () => {
      // Arrange
      const mockCategory = createCategoryFixture({ id: 5 });
      mockFindUnique.mockResolvedValue(mockCategory);

      // Act
      const result = await categoryRepository.findById(5);

      // Assert
      expect(result).toEqual(mockCategory);
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: 5 },
      });
    });

    it("should return null when id does not exist", async () => {
      // Arrange
      mockFindUnique.mockResolvedValue(null);

      // Act
      const result = await categoryRepository.findById(999);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe("findByName", () => {
    it("should return category when name exists (case insensitive)", async () => {
      // Arrange
      const mockCategory = createCategoryFixture({ name: "Main Dishes" });
      mockFindFirst.mockResolvedValue(mockCategory);

      // Act
      const result = await categoryRepository.findByName("main dishes");

      // Assert
      expect(result).toEqual(mockCategory);
      expect(mockFindFirst).toHaveBeenCalledWith({
        where: {
          name: {
            equals: "main dishes",
            mode: "insensitive",
          },
          deleted: false,
        },
      });
    });

    it("should return null when name does not exist", async () => {
      // Arrange
      mockFindFirst.mockResolvedValue(null);

      // Act
      const result = await categoryRepository.findByName("Nonexistent");

      // Assert
      expect(result).toBeNull();
    });
  });

  describe("create", () => {
    it("should create category", async () => {
      // Arrange
      const createData = {
        name: "New Category",
        description: "A new category",
        order: 5,
      };
      const mockCreatedCategory = createCategoryFixture({
        id: 10,
        ...createData,
      });
      mockCreate.mockResolvedValue(mockCreatedCategory);

      // Act
      const result = await categoryRepository.create(createData);

      // Assert
      expect(result).toEqual(mockCreatedCategory);
      expect(mockCreate).toHaveBeenCalledWith({
        data: createData,
      });
    });
  });

  describe("update", () => {
    it("should update category fields", async () => {
      // Arrange
      const updateData = { name: "Updated Name", order: 3 };
      const mockUpdatedCategory = createCategoryFixture({
        id: 1,
        name: "Updated Name",
        order: 3,
      });
      mockUpdate.mockResolvedValue(mockUpdatedCategory);

      // Act
      const result = await categoryRepository.update(1, updateData);

      // Assert
      expect(result.name).toBe("Updated Name");
      expect(result.order).toBe(3);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: updateData,
      });
    });
  });

  describe("delete", () => {
    it("should soft delete category", async () => {
      // Arrange
      const mockDeletedCategory = createCategoryFixture({
        id: 1,
        deleted: true,
      });
      mockUpdate.mockResolvedValue(mockDeletedCategory);

      // Act
      const result = await categoryRepository.delete(1);

      // Assert
      expect(result.deleted).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { deleted: true },
      });
    });
  });

  describe("bulkDelete", () => {
    it("should soft delete multiple categories", async () => {
      // Arrange
      mockUpdateMany.mockResolvedValue({ count: 3 });

      // Act
      const result = await categoryRepository.bulkDelete([1, 2, 3]);

      // Assert
      expect(result).toBe(3);
      expect(mockUpdateMany).toHaveBeenCalledWith({
        where: {
          id: { in: [1, 2, 3] },
          deleted: false,
        },
        data: { deleted: true },
      });
    });

    it("should return 0 when no categories found", async () => {
      // Arrange
      mockUpdateMany.mockResolvedValue({ count: 0 });

      // Act
      const result = await categoryRepository.bulkDelete([999, 998]);

      // Assert
      expect(result).toBe(0);
    });
  });

  describe("search", () => {
    it("should search categories by name", async () => {
      // Arrange
      const mockCategories = [
        createCategoryFixture({ id: 1, name: "Main Dishes" }),
      ];
      mockFindMany.mockResolvedValue(mockCategories);
      mockCount.mockResolvedValue(1);

      // Act
      const result = await categoryRepository.search({
        page: 1,
        limit: 10,
        search: "main",
      });

      // Assert
      expect(result.data).toHaveLength(1);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: {
              contains: "main",
              mode: "insensitive",
            },
          }),
        }),
      );
    });

    it("should filter by active status", async () => {
      // Arrange
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      // Act
      await categoryRepository.search({
        page: 1,
        limit: 10,
        active: true,
      });

      // Assert
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            active: true,
          }),
        }),
      );
    });

    it("should combine search and active filters", async () => {
      // Arrange
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      // Act
      await categoryRepository.search({
        page: 1,
        limit: 10,
        search: "test",
        active: false,
      });

      // Assert
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            deleted: false,
            name: {
              contains: "test",
              mode: "insensitive",
            },
            active: false,
          },
        }),
      );
    });

    it("should always exclude deleted categories", async () => {
      // Arrange
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      // Act
      await categoryRepository.search({ page: 1, limit: 10 });

      // Assert
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deleted: false,
          }),
        }),
      );
    });
  });
});
