// Create mock functions
const mockFindMany = jest.fn();
const mockFindUnique = jest.fn();
const mockUpdate = jest.fn();
const mockCount = jest.fn();

// Mock Prisma
jest.mock("../../../../database/prisma", () => ({
  __esModule: true,
  default: {
    user: {
      findMany: mockFindMany,
      findUnique: mockFindUnique,
      update: mockUpdate,
      count: mockCount,
    },
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

import profileRepository from "../../profile.repository";
import { createUserWithProfileFixture } from "../helpers";

describe("ProfileRepository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("findAll", () => {
    it("should return paginated users with profiles", async () => {
      // Arrange
      const mockUsers = [
        createUserWithProfileFixture({ id: "user-1" }),
        createUserWithProfileFixture({ id: "user-2" }),
      ];
      mockFindMany.mockResolvedValue(mockUsers);
      mockCount.mockResolvedValue(2);

      // Act
      const result = await profileRepository.findAll({ page: 1, limit: 10 });

      // Assert
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
    });

    it("should calculate skip correctly for pagination", async () => {
      // Arrange
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(50);

      // Act
      await profileRepository.findAll({ page: 3, limit: 15 });

      // Assert
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 30,
          take: 15,
        }),
      );
    });

    it("should filter out deleted users", async () => {
      // Arrange
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      // Act
      await profileRepository.findAll({ page: 1, limit: 10 });

      // Assert
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deleted: false },
        }),
      );
    });

    it("should order by firstName and lastName ascending", async () => {
      // Arrange
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      // Act
      await profileRepository.findAll({ page: 1, limit: 10 });

      // Assert
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
        }),
      );
    });

    it("should include profile in results", async () => {
      // Arrange
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      // Act
      await profileRepository.findAll({ page: 1, limit: 10 });

      // Assert
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: { profile: true },
        }),
      );
    });
  });

  describe("findById", () => {
    it("should return user with profile when id exists", async () => {
      // Arrange
      const mockUserWithProfile = createUserWithProfileFixture({
        id: "user-123",
      });
      mockFindUnique.mockResolvedValue(mockUserWithProfile);

      // Act
      const result = await profileRepository.findById("user-123");

      // Assert
      expect(result).toEqual(mockUserWithProfile);
      expect(result?.profile).toBeDefined();
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: "user-123" },
        include: { profile: true },
      });
    });

    it("should return null when id does not exist", async () => {
      // Arrange
      mockFindUnique.mockResolvedValue(null);

      // Act
      const result = await profileRepository.findById("non-existent-id");

      // Assert
      expect(result).toBeNull();
    });
  });

  describe("update", () => {
    it("should update user and profile fields", async () => {
      // Arrange
      const updateData = {
        firstName: "Jane",
        lastName: "Smith",
        address: "123 Main St",
      };
      const mockUpdatedUser = createUserWithProfileFixture(
        { firstName: "Jane", lastName: "Smith" },
        { address: "123 Main St" },
      );
      mockUpdate.mockResolvedValue(mockUpdatedUser);

      // Act
      const result = await profileRepository.update("user-123", updateData);

      // Assert
      expect(result.firstName).toBe("Jane");
      expect(result.lastName).toBe("Smith");
      expect(result.profile?.address).toBe("123 Main St");
    });

    it("should update only user fields when no profile data provided", async () => {
      // Arrange
      const updateData = {
        firstName: "Jane",
        phone: "9876543210",
      };
      const mockUpdatedUser = createUserWithProfileFixture({
        firstName: "Jane",
        phone: "9876543210",
      });
      mockUpdate.mockResolvedValue(mockUpdatedUser);

      // Act
      const result = await profileRepository.update("user-123", updateData);

      // Assert
      expect(result.firstName).toBe("Jane");
      expect(result.phone).toBe("9876543210");
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "user-123" },
        data: expect.objectContaining({
          firstName: "Jane",
          phone: "9876543210",
          profile: { update: {} },
        }),
        include: { profile: true },
      });
    });

    it("should update only profile fields when no user data provided", async () => {
      // Arrange
      const updateData = {
        photoUrl: "https://example.com/avatar.jpg",
        identification: "12345678",
      };
      const mockUpdatedUser = createUserWithProfileFixture(
        {},
        {
          photoUrl: "https://example.com/avatar.jpg",
          identification: "12345678",
        },
      );
      mockUpdate.mockResolvedValue(mockUpdatedUser);

      // Act
      const result = await profileRepository.update("user-123", updateData);

      // Assert
      expect(result.profile?.photoUrl).toBe("https://example.com/avatar.jpg");
      expect(result.profile?.identification).toBe("12345678");
    });

    it("should include profile in update result", async () => {
      // Arrange
      const updateData = { firstName: "Updated" };
      const mockUpdatedUser = createUserWithProfileFixture({
        firstName: "Updated",
      });
      mockUpdate.mockResolvedValue(mockUpdatedUser);

      // Act
      await profileRepository.update("user-123", updateData);

      // Assert
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          include: { profile: true },
        }),
      );
    });
  });
});
