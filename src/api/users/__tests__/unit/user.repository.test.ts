import {
  createUserFixture,
  createUserFixtures,
  createUserWithRolesFixture,
} from "../helpers/user.fixtures";
import { UserWithRoles } from "../../user.repository";
import { UserSearchParams } from "../../user.validator";

// Create mock functions
const mockFindMany = jest.fn();
const mockFindUnique = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockCount = jest.fn();

// Mock Prisma and getPrismaClient
const mockPrismaClient = {
  user: {
    findMany: mockFindMany,
    findUnique: mockFindUnique,
    create: mockCreate,
    update: mockUpdate,
    count: mockCount,
  },
};

jest.mock("../../../../database/prisma", () => ({
  __esModule: true,
  default: mockPrismaClient,
  getPrismaClient: jest.fn(() => mockPrismaClient),
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

import userRepository from "../../user.repository";

describe("UserRepository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("findAll", () => {
    it("should return paginated users with roles", async () => {
      // Arrange
      const mockUsers: UserWithRoles[] = createUserFixtures(2).map((user) =>
        createUserWithRolesFixture(user),
      );
      mockFindMany.mockResolvedValue(mockUsers);
      mockCount.mockResolvedValue(2);

      // Act
      const result = await userRepository.findAll({ page: 1, limit: 10 });

      // Assert
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
      // Verify that users include roles structure
      result.data.forEach((user) => {
        expect(user).toHaveProperty("roles");
        expect(Array.isArray(user.roles)).toBe(true);
      });
    });

    it("should calculate skip correctly for pagination", async () => {
      // Arrange
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(100);

      // Act
      await userRepository.findAll({ page: 3, limit: 20 });

      // Assert - page 3 with limit 20 = skip 40
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 40,
          take: 20,
        }),
      );
    });

    it("should filter out deleted users", async () => {
      // Arrange
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      // Act
      await userRepository.findAll({ page: 1, limit: 10 });

      // Assert
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deleted: false },
          include: {
            roles: {
              include: {
                role: true,
              },
            },
          },
        }),
      );
      expect(mockCount).toHaveBeenCalledWith({
        where: { deleted: false },
      });
    });

    it("should order users by firstName and lastName ascending", async () => {
      // Arrange
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      // Act
      await userRepository.findAll({ page: 1, limit: 10 });

      // Assert
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
          include: {
            roles: {
              include: {
                role: true,
              },
            },
          },
        }),
      );
    });

    it("should handle empty results", async () => {
      // Arrange
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      // Act
      const result = await userRepository.findAll({ page: 1, limit: 10 });

      // Assert
      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });
  });

  describe("findByEmail", () => {
    it("should return user when email exists", async () => {
      // Arrange
      const mockUser = createUserFixture({ email: "test@example.com" });
      mockFindUnique.mockResolvedValue(mockUser);

      // Act
      const result = await userRepository.findByEmail("test@example.com");

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { email: "test@example.com" },
      });
    });

    it("should return null when email does not exist", async () => {
      // Arrange
      mockFindUnique.mockResolvedValue(null);

      // Act
      const result = await userRepository.findByEmail("unknown@example.com");

      // Assert
      expect(result).toBeNull();
    });
  });

  describe("findById", () => {
    it("should return user when id exists", async () => {
      // Arrange
      const mockUser = createUserFixture({ id: "user-123" });
      mockFindUnique.mockResolvedValue(mockUser);

      // Act
      const result = await userRepository.findById("user-123");

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: "user-123" },
      });
    });

    it("should return null when id does not exist", async () => {
      // Arrange
      mockFindUnique.mockResolvedValue(null);

      // Act
      const result = await userRepository.findById("non-existent-id");

      // Assert
      expect(result).toBeNull();
    });
  });

  describe("create", () => {
    it("should create user with roles and profile", async () => {
      // Arrange
      const createData = {
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        password: "hashedPassword123",
        roleIds: [1, 2],
      };
      const mockCreatedUser = createUserFixture({
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
      });
      mockCreate.mockResolvedValue(mockCreatedUser);

      // Act
      const result = await userRepository.create(createData);

      // Assert
      expect(result).toEqual(mockCreatedUser);
      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
          password: "hashedPassword123",
          roles: {
            create: [
              { role: { connect: { id: 1 } } },
              { role: { connect: { id: 2 } } },
            ],
          },
          profile: { create: {} },
        }),
        include: {
          roles: { include: { role: true } },
        },
      });
    });

    it("should create user without roles when roleIds is empty", async () => {
      // Arrange
      const createData = {
        firstName: "Jane",
        lastName: "Doe",
        email: "jane@example.com",
        password: "hashedPassword123",
        roleIds: [],
      };
      const mockCreatedUser = createUserFixture({
        firstName: "Jane",
        email: "jane@example.com",
      });
      mockCreate.mockResolvedValue(mockCreatedUser);

      // Act
      const result = await userRepository.create(createData);

      // Assert
      expect(result).toEqual(mockCreatedUser);
      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          roles: { create: [] },
        }),
        include: expect.any(Object),
      });
    });
  });

  describe("update", () => {
    it("should update user fields", async () => {
      // Arrange
      const userId = "user-123";
      const updateData = { firstName: "Jane", lastName: "Smith" };
      const mockUpdatedUser = createUserFixture({
        id: userId,
        firstName: "Jane",
        lastName: "Smith",
      });
      mockUpdate.mockResolvedValue(mockUpdatedUser);

      // Act
      const result = await userRepository.update(userId, updateData);

      // Assert
      expect(result.firstName).toBe("Jane");
      expect(result.lastName).toBe("Smith");
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: userId },
        data: updateData,
      });
    });

    it("should handle partial updates", async () => {
      // Arrange
      const userId = "user-123";
      const updateData = { phone: "9876543210" };
      const mockUpdatedUser = createUserFixture({
        id: userId,
        phone: "9876543210",
      });
      mockUpdate.mockResolvedValue(mockUpdatedUser);

      // Act
      const result = await userRepository.update(userId, updateData);

      // Assert
      expect(result.phone).toBe("9876543210");
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: userId },
        data: { phone: "9876543210" },
      });
    });
  });

  describe("findUserWithPermissions", () => {
    it("should return user with roles and permissions", async () => {
      // Arrange
      const mockUserWithPermissions = {
        ...createUserFixture({ id: "user-123" }),
        roles: [
          {
            role: {
              id: 1,
              name: "ADMIN",
              permissions: [
                { permission: { id: 1, name: "users:read" } },
                { permission: { id: 2, name: "users:write" } },
              ],
            },
          },
        ],
      };
      mockFindUnique.mockResolvedValue(mockUserWithPermissions);

      // Act
      const result = await userRepository.findUserWithPermissions("user-123");

      // Assert
      expect(result).toEqual(mockUserWithPermissions);
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: "user-123" },
        include: {
          roles: {
            include: {
              role: {
                include: {
                  permissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
    });

    it("should return null when user does not exist", async () => {
      // Arrange
      mockFindUnique.mockResolvedValue(null);

      // Act
      const result =
        await userRepository.findUserWithPermissions("non-existent-id");

      // Assert
      expect(result).toBeNull();
    });
  });

  describe("search", () => {
    it("should search users by firstName, lastName, or email", async () => {
      // Arrange
      const mockUsers: UserWithRoles[] = [
        createUserWithRolesFixture({
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
        }),
        createUserWithRolesFixture({
          firstName: "Jane",
          lastName: "Smith",
          email: "jane@example.com",
        }),
      ];
      mockFindMany.mockResolvedValue(mockUsers);
      mockCount.mockResolvedValue(2);

      // Act
      const result = await userRepository.search({
        page: 1,
        limit: 10,
        search: "john",
      });

      // Assert
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            deleted: false,
            OR: [
              { firstName: { contains: "john", mode: "insensitive" } },
              { lastName: { contains: "john", mode: "insensitive" } },
              { email: { contains: "john", mode: "insensitive" } },
            ],
          },
          include: {
            roles: {
              include: {
                role: true,
              },
            },
          },
        }),
      );
    });

    it("should return all users when search term is not provided", async () => {
      // Arrange
      const mockUsers: UserWithRoles[] = createUserFixtures(2).map((user) =>
        createUserWithRolesFixture(user),
      );
      mockFindMany.mockResolvedValue(mockUsers);
      mockCount.mockResolvedValue(2);

      // Act
      const result = await userRepository.search({ page: 1, limit: 10 });

      // Assert
      expect(result.data).toHaveLength(2);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deleted: false },
        }),
      );
    });

    it("should always exclude deleted users in search", async () => {
      // Arrange
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      // Act
      await userRepository.search({ page: 1, limit: 10, search: "test" });

      // Assert
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deleted: false,
          }),
        }),
      );
    });

    it("should order results by firstName and lastName ascending", async () => {
      // Arrange
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      // Act
      await userRepository.search({ page: 1, limit: 10, search: "test" });

      // Assert
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
        }),
      );
    });

    it("should include roles in search results", async () => {
      // Arrange
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      // Act
      await userRepository.search({ page: 1, limit: 10, search: "test" });

      // Assert
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            roles: {
              include: {
                role: true,
              },
            },
          },
        }),
      );
    });
  });
});
