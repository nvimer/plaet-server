import { UserRepositoryInterface } from "../../interfaces/user.repository.interface";
import { RoleServiceInterface } from "../../../roles/interfaces/role.service.interface";
import { CustomError } from "../../../../types/custom-errors";
import { HttpStatus } from "../../../../utils/httpStatus.enum";
import { User, Role } from "@prisma/client";
import {
  PaginationParams,
  PaginatedResponse,
} from "../../../../interfaces/pagination.interfaces";
import { RegisterInput } from "../../../auth/auth.validator";
import { UpdateUserInput, UserSearchParams } from "../../user.validator";
import { AuthenticatedUser } from "../../../../types/express";
import { UserServices } from "../../user.service";
import { UserWithRoles } from "../../user.repository";
import hasherUtils from "../../../../utils/hasher.utils";

// Mock hasher utils
jest.mock("../../../../utils/hasher.utils", () => ({
  __esModule: true,
  default: {
    hash: jest.fn(),
    comparePass: jest.fn(),
  },
}));

describe("UserServices", () => {
  let userService: UserServices;
  let mockUserRepository: jest.Mocked<UserRepositoryInterface>;
  let mockRoleService: jest.Mocked<RoleServiceInterface>;

  // Test data factory
  const createMockUser = (overrides: Partial<User> = {}): User => ({
    id: "123e4567-e89b-12d3-a456-426614174000",
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    password: "hashedPassword123",
    phone: "1234567890",
    deleted: false,
    deletedAt: null,
    createdAt: new Date("2023-01-01"),
    updatedAt: new Date("2023-01-01"),
  });

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
    // Create fresh moks for each test
    mockUserRepository = {
      findAll: jest.fn(),
      search: jest.fn(),
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findUserWithPermissions: jest.fn(),
    };

    mockRoleService = {
      findAll: jest.fn(),
      searchRoles: jest.fn(),
      findById: jest.fn(),
      createRole: jest.fn(),
      updateRole: jest.fn(),
      deleteRole: jest.fn(),
      bulkDeleteRoles: jest.fn(),
    };

    // Create service instance witho mocked dependencies
    userService = new UserServices(mockUserRepository, mockRoleService);

    // Reset hasher mock
    jest.mocked(hasherUtils.hash).mockReturnValue("hashedPassword");
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("findAll", () => {
    it("should return paginated users", async () => {
      // Arrange
      const mockUsers: UserWithRoles[] = [
        {
          ...createMockUser({ id: "id-1", email: "user1@example.com" }),
          roles: [],
        },
        {
          ...createMockUser({ id: "id-2", email: "user2@example.com" }),
          roles: [],
        },
        {
          ...createMockUser({ id: "id-3", email: "user3@example.com" }),
          roles: [],
        },
      ];
      const params: PaginationParams = { page: 1, limit: 10 };
      const expectedResponse = createPaginatedResponse(mockUsers);

      mockUserRepository.findAll.mockResolvedValue(expectedResponse);

      // Act
      const result = await userService.findAll(params);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(result.data).toHaveLength(3);
      expect(mockUserRepository.findAll).toHaveBeenCalledWith(params);
      expect(mockUserRepository.findAll).toHaveBeenCalledTimes(1);
    });

    it("should handle empty results", async () => {
      // Arrange
      const params: PaginationParams = { page: 1, limit: 10 };
      const expectedResponse = createPaginatedResponse<UserWithRoles>([], {
        total: 0,
        totalPages: 0,
      });

      mockUserRepository.findAll.mockResolvedValue(expectedResponse);

      // Act
      const result = await userService.findAll(params);

      // Assert
      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });
  });

  describe("findById", () => {
    it("should return user when found", async () => {
      // Arrange
      const mockUser = createMockUser();
      mockUserRepository.findById.mockResolvedValue(mockUser);

      // Act
      const result = await userService.findById(mockUser.id);

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(mockUser.id);
    });

    it("should throw NOT_FOUND error when user doesn't exist", async () => {
      // Arrange
      const userId = "non-existent-id";
      mockUserRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(userService.findById(userId)).rejects.toThrow(CustomError);
      await expect(userService.findById(userId)).rejects.toMatchObject({
        message: `User with ID ${userId} not found.`,
        statusCode: HttpStatus.NOT_FOUND,
        errorCode: "ID_NOT_FOUND",
      });
    });
  });

  describe("findByEmail", () => {
    it("should return user when found", async () => {
      // Arrange
      const mockUser = createMockUser();
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);

      // Act
      const result = await userService.findByEmail(mockUser.email);

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
        mockUser.email,
      );
    });

    it("should throw NOT_FOUND error when user doesn't exist", async () => {
      // Arrange
      const email = "nonexistent@example.com";
      mockUserRepository.findByEmail.mockResolvedValue(null);

      // Act & Assert
      await expect(userService.findByEmail(email)).rejects.toThrow(CustomError);
      await expect(userService.findByEmail(email)).rejects.toMatchObject({
        message: `User with email ${email} not found. Please retry.`,
        statusCode: HttpStatus.CONFLICT,
        errorCode: "NOT_FOUND",
      });
    });
  });

  describe("register", () => {
    const validRegistrationData: RegisterInput = {
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
      password: "password123",
      roleIds: [],
    };

    it("should successfully register a new user", async () => {
      // Arrange
      const createdUser = createMockUser({
        email: validRegistrationData.email,
      });

      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(createdUser);
      jest.mocked(hasherUtils.hash).mockReturnValue("hashedPassword123");

      // Act
      const result = await userService.register(validRegistrationData);

      // Assert
      expect(result).toBeDefined();
      expect(result).not.toHaveProperty("password");
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
        validRegistrationData.email,
      );
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        ...validRegistrationData,
        password: "hashedPassword123",
      });
    });

    it("should throw EMAIL_CONFLICT error when email already exists", async () => {
      // Arrange
      const existingUser = createMockUser({
        email: validRegistrationData.email,
      });
      mockUserRepository.findByEmail.mockResolvedValue(existingUser);

      // Act & Assert
      await expect(userService.register(validRegistrationData)).rejects.toThrow(
        CustomError,
      );
      await expect(
        userService.register(validRegistrationData),
      ).rejects.toMatchObject({
        statusCode: HttpStatus.CONFLICT,
        errorCode: "EMAIL_CONFLICT",
      });

      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it("should exclude password from returned user", async () => {
      // Arrange
      const createdUser = createMockUser({
        email: validRegistrationData.email,
        password: "hashedPassword",
      });

      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(createdUser);

      // Act
      const result = await userService.register(validRegistrationData);

      // Assert
      expect(result).not.toHaveProperty("password");
    });
  });

  describe("updateUser", () => {
    const updateData: UpdateUserInput = {
      firstName: "Jane",
      lastName: "Smith",
      email: "jane.smith@example.com",
    };

    it("should successfully update user", async () => {
      // Arrange
      const existingUser = createMockUser();
      const updatedUser = createMockUser({ ...updateData });

      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.update.mockResolvedValue(updatedUser);

      // Act
      const result = await userService.updateUser(existingUser.id, updateData);

      // Assert
      expect(result).toEqual(updatedUser);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(existingUser.id);
      expect(mockUserRepository.update).toHaveBeenCalledWith(
        existingUser.id,
        updateData,
      );
    });

    it("should throw ID_NOT_FOUND error when user doesn't exist", async () => {
      // Arrange
      const userId = "non-existent-id";
      mockUserRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(userService.updateUser(userId, updateData)).rejects.toThrow(
        CustomError,
      );
      await expect(
        userService.updateUser(userId, updateData),
      ).rejects.toMatchObject({
        statusCode: HttpStatus.NOT_FOUND,
        errorCode: "ID_NOT_FOUND",
      });

      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });

    it("should throw EMAIL_CONFLICT error when updating to existing email", async () => {
      // Arrange
      const existingUser = createMockUser();
      const anotherUser = createMockUser({
        id: "another-id",
        email: updateData.email,
      });

      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserRepository.findByEmail.mockResolvedValue(anotherUser);

      // Act & Assert
      await expect(
        userService.updateUser(existingUser.id, updateData),
      ).rejects.toThrow(CustomError);
      await expect(
        userService.updateUser(existingUser.id, updateData),
      ).rejects.toMatchObject({
        statusCode: HttpStatus.CONFLICT,
        errorCode: "EMAIL_CONFLICT",
      });

      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });

    it("should allow partial updates", async () => {
      // Arrange
      const userId = "123e4567-e89b-12d3-a456-426614174000";
      const existingUser = createMockUser({ id: userId, firstName: "John" });
      const partialUpdate: UpdateUserInput = { firstName: "Jane" };
      const updatedUser = createMockUser({ id: userId, firstName: "Jane" });

      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserRepository.update.mockResolvedValue(updatedUser);

      // Act
      const result = await userService.updateUser(userId, partialUpdate);

      // Assert - verify mocks were called
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.update).toHaveBeenCalledWith(
        userId,
        partialUpdate,
      );
      // Assert - update mock was set correctly
      expect(mockUserRepository.update.mock.results[0].value).resolves.toEqual(
        updatedUser,
      );
    });

    it("should not check email conflict when email is not being updated", async () => {
      // Arrange
      const existingUser = createMockUser();
      const updateWithoutEmail: UpdateUserInput = { firstName: "Jane" };
      const updatedUser = createMockUser({ firstName: "Jane" });

      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserRepository.update.mockResolvedValue(updatedUser);

      // Act
      await userService.updateUser(existingUser.id, updateWithoutEmail);

      // Assert
      expect(mockUserRepository.findByEmail).not.toHaveBeenCalled();
    });
  });

  describe("findUserWithRolesAndPermissions", () => {
    it("should return user with roles and permissions", async () => {
      // Arrange
      const mockUser = createMockUser();
      const userWithPermissions: AuthenticatedUser = {
        ...mockUser,
        roles: [],
      };

      mockUserRepository.findUserWithPermissions.mockResolvedValue(
        userWithPermissions,
      );

      // Act
      const result = await userService.findUserWithRolesAndPermissions(
        mockUser.id,
      );

      // Assert
      expect(result).toEqual(userWithPermissions);
      expect(mockUserRepository.findUserWithPermissions).toHaveBeenCalledWith(
        mockUser.id,
      );
    });

    it("should throw ID_NOT_FOUND error when user doesn't exist", async () => {
      // Arrange
      const userId = "non-existent-id";
      mockUserRepository.findUserWithPermissions.mockResolvedValue(null);

      // Act & Assert
      await expect(
        userService.findUserWithRolesAndPermissions(userId),
      ).rejects.toThrow(CustomError);
      await expect(
        userService.findUserWithRolesAndPermissions(userId),
      ).rejects.toMatchObject({
        statusCode: HttpStatus.NOT_FOUND,
        errorCode: "ID_NOT_FOUND",
      });
    });
  });

  describe("Error Handling", () => {
    it("should  propagate repository errors", async () => {
      // Arrange
      const userId = "test-id";
      const dbError = new Error("Database connection failed");
      mockUserRepository.findById.mockRejectedValue(dbError);

      // Act & Assert
      await expect(userService.findById(userId)).rejects.toThrow(
        "Database connection failed",
      );
    });

    it("should handle hasher errors", async () => {
      // Arrange
      const registrationData: RegisterInput = {
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@example.com",
        password: "password123",
        roleIds: [],
      };

      mockUserRepository.findByEmail.mockResolvedValue(null);
      jest.mocked(hasherUtils.hash).mockImplementation(() => {
        throw new Error("Hashing failed");
      });

      // Act & Assert - Error propagates with original message
      await expect(userService.register(registrationData)).rejects.toThrow(
        "Hashing failed",
      );
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty update data", async () => {
      // Arrange
      const mockUser = createMockUser();
      const emptyUpdate: UpdateUserInput = {};

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.update.mockResolvedValue(mockUser);

      // Act
      const result = await userService.updateUser(mockUser.id, emptyUpdate);

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockUserRepository.update).toHaveBeenCalledWith(
        mockUser.id,
        emptyUpdate,
      );
    });

    it("should handle pagination edge cases", async () => {
      // Arrange
      const extremeParams: PaginationParams = { page: 999, limit: 1 };
      const emptyResponse: PaginatedResponse<UserWithRoles> = {
        data: [],
        meta: {
          total: 0,
          page: 999,
          limit: 1,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: true,
        },
      };

      mockUserRepository.findAll.mockResolvedValue(emptyResponse);

      // Act
      const result = await userService.findAll(extremeParams);

      // Assert
      expect(result.data).toEqual([]);
      expect(result.meta.page).toBe(999);
    });
  });

  describe("searchUsers", () => {
    it("should return paginated search results when valid params provided", async () => {
      // Arrange
      const mockUsers: UserWithRoles[] = [
        {
          ...createMockUser({
            id: "id-1",
            email: "user1@example.com",
            firstName: "John",
          }),
          roles: [],
        },
        {
          ...createMockUser({
            id: "id-2",
            email: "user2@example.com",
            firstName: "Jane",
          }),
          roles: [],
        },
      ];
      const params: PaginationParams & UserSearchParams = {
        page: 1,
        limit: 10,
        search: "john",
      };
      const expectedResponse = createPaginatedResponse(mockUsers);

      mockUserRepository.search.mockResolvedValue(expectedResponse);

      // Act
      const result = await userService.searchUsers(params);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(result.data).toHaveLength(2);
      expect(mockUserRepository.search).toHaveBeenCalledWith(params);
      expect(mockUserRepository.search).toHaveBeenCalledTimes(1);
    });

    it("should handle empty search results", async () => {
      // Arrange
      const params: PaginationParams & UserSearchParams = {
        page: 1,
        limit: 10,
        search: "nonexistent",
      };
      const expectedResponse = createPaginatedResponse<UserWithRoles>([], {
        total: 0,
        totalPages: 0,
      });

      mockUserRepository.search.mockResolvedValue(expectedResponse);

      // Act
      const result = await userService.searchUsers(params);

      // Assert
      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
      expect(mockUserRepository.search).toHaveBeenCalledWith(params);
    });

    it("should search without search term when not provided", async () => {
      // Arrange
      const params: PaginationParams & UserSearchParams = {
        page: 1,
        limit: 10,
      };
      const expectedResponse = createPaginatedResponse<UserWithRoles>([], {
        total: 0,
        totalPages: 0,
      });

      mockUserRepository.search.mockResolvedValue(expectedResponse);

      // Act
      const result = await userService.searchUsers(params);

      // Assert
      expect(result.data).toEqual([]);
      expect(mockUserRepository.search).toHaveBeenCalledWith(params);
    });
  });
});
