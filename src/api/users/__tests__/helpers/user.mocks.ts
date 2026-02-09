import { UserRepositoryInterface } from "../../interfaces/user.repository.interface";
import { UserServiceInterface } from "../../interfaces/user.service.interface";
import { RoleServiceInterface } from "../../../roles/interfaces/role.service.interface";

/**
 * Creates a mocked UserRepository with all methods as jest.fn()
 */
export function createMockUserRepository(): jest.Mocked<UserRepositoryInterface> {
  return {
    findAll: jest.fn(),
    search: jest.fn(),
    findByEmail: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findUserWithPermissions: jest.fn(),
  };
}

/**
 * Creates a mocked UserService with all methods as jest.fn()
 */
export function createMockUserService(): jest.Mocked<UserServiceInterface> {
  return {
    findAll: jest.fn(),
    searchUsers: jest.fn(),
    findById: jest.fn(),
    findByEmail: jest.fn(),
    register: jest.fn(),
    updateUser: jest.fn(),
    findUserWithRolesAndPermissions: jest.fn(),
  };
}

/**
 * Creates a mocked RoleService (dependency of UserService)
 */
export function createMockRoleService(): jest.Mocked<RoleServiceInterface> {
  return {
    findAll: jest.fn(),
    searchRoles: jest.fn(),
    findById: jest.fn(),
    createRole: jest.fn(),
    updateRole: jest.fn(),
    deleteRole: jest.fn(),
    bulkDeleteRoles: jest.fn(),
  };
}

/**
 * Creates a mocked hasher utility
 */
export function createMockHasherUtils() {
  return {
    hash: jest.fn().mockReturnValue("mocked-hashed-password"),
    comparePass: jest.fn().mockResolvedValue(true),
  };
}

/**
 * Pre-configured mock scenarios for common test cases
 */
export const userMockScenarios = {
  /**
   * Configures mock to simulate user not found
   */
  userNotFound: (mockRepo: jest.Mocked<UserRepositoryInterface>) => {
    mockRepo.findById.mockResolvedValue(null);
    mockRepo.findByEmail.mockResolvedValue(null);
  },

  /**
   * Configures mock to simulate email already taken
   */
  emailAlreadyTaken: (
    mockRepo: jest.Mocked<UserRepositoryInterface>,
    existingUser: ReturnType<
      typeof import("./user.fixtures").createUserFixture
    >,
  ) => {
    mockRepo.findByEmail.mockResolvedValue(existingUser);
  },

  /**
   * Configures mock to simulate database error
   */
  databaseError: (mockRepo: jest.Mocked<UserRepositoryInterface>) => {
    const error = new Error("Database connection failed");
    mockRepo.findById.mockRejectedValue(error);
    mockRepo.findByEmail.mockRejectedValue(error);
    mockRepo.findAll.mockRejectedValue(error);
    mockRepo.create.mockRejectedValue(error);
    mockRepo.update.mockRejectedValue(error);
  },

  /**
   * Configures mock to simulate role not found
   */
  roleNotFound: (mockRoleService: jest.Mocked<RoleServiceInterface>) => {
    mockRoleService.findById.mockResolvedValue(null as never);
  },
};
