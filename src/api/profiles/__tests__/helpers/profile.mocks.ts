/**
 * Profile Mocks - Jest Mock Factories for Unit Tests
 *
 * These factories create properly typed Jest mocks for profile-related
 * interfaces. Use them to mock dependencies in unit tests.
 *
 * @example
 * const mockRepo = createMockProfileRepository();
 * mockRepo.findById.mockResolvedValue(profileFixture);
 * const service = new ProfileService(mockRepo);
 */
import { ProfileRepositoryInterface } from "../../interfaces/profile.repository.interface";
import { ProfileServiceInterface } from "../../interfaces/profile.service.interface";
import {
  createProfileFixture,
  createUserWithProfileFixture,
} from "./profile.fixtures";

/**
 * Creates a mocked ProfileRepository with all methods as jest.fn()
 */
export function createMockProfileRepository(): jest.Mocked<ProfileRepositoryInterface> {
  return {
    findAll: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    updatePhoto: jest.fn(),
  };
}

/**
 * Creates a mocked ProfileService with all methods as jest.fn()
 */
export function createMockProfileService(): jest.Mocked<ProfileServiceInterface> {
  return {
    findAll: jest.fn(),
    findById: jest.fn(),
    updateUser: jest.fn(),
    getMyProfile: jest.fn(),
    updatePhoto: jest.fn(),
  };
}

/**
 * Pre-configured mock scenarios for common test cases
 */
export const profileMockScenarios = {
  /**
   * Configures mock with a valid profile
   */
  profileFound: (mockRepo: jest.Mocked<ProfileRepositoryInterface>) => {
    const userWithProfile = createUserWithProfileFixture();
    mockRepo.findById.mockResolvedValue(userWithProfile);
  },

  /**
   * Configures mock to simulate profile not found
   */
  profileNotFound: (mockRepo: jest.Mocked<ProfileRepositoryInterface>) => {
    mockRepo.findById.mockResolvedValue(null);
  },

  /**
   * Configures mock to simulate database error
   */
  databaseError: (mockRepo: jest.Mocked<ProfileRepositoryInterface>) => {
    const error = new Error("Database connection failed");
    mockRepo.findById.mockRejectedValue(error);
    mockRepo.findAll.mockRejectedValue(error);
    mockRepo.update.mockRejectedValue(error);
  },
};
