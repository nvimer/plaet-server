/**
 * Profile Fixtures - Pure JavaScript Objects for Unit Tests
 *
 * These fixtures create mock Profile objects WITHOUT database interaction.
 * Use them in unit tests where you need to mock repository responses.
 *
 * @example
 * const mockProfile = createProfileFixture({ address: "123 Main St" });
 * mockRepository.findById.mockResolvedValue(mockProfile);
 */
import { Profile, User } from "@prisma/client";

/**
 * Base profile fixture with default values
 */
export function createProfileFixture(
  overrides: Partial<Profile> = {},
): Profile {
  return {
    id: "profile-fixture-id-001",
    userId: "user-fixture-id-001",
    photoUrl: null,
    birthDate: null,
    identification: null,
    address: null,
    deleted: false,
    deletedAt: null,
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

/**
 * Creates a profile fixture with complete data
 */
export function createCompleteProfileFixture(
  overrides: Partial<Profile> = {},
): Profile {
  return createProfileFixture({
    photoUrl: "https://example.com/photo.jpg",
    birthDate: new Date("1990-05-15"),
    identification: "123456789",
    address: "123 Main St, City",
    ...overrides,
  });
}

/**
 * Creates a user fixture with profile included
 */
export function createUserWithProfileFixture(
  userOverrides: Partial<User> = {},
  profileOverrides: Partial<Profile> = {},
) {
  const userId = userOverrides.id ?? "user-fixture-id-001";
  return {
    id: userId,
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@fixture.test",
    password: "hashedPassword$2b$10$XXXXXXXXXXXX",
    phone: "3001234567",
    deleted: false,
    deletedAt: null,
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
    // Auth fields
    emailVerified: true,
    emailVerifiedAt: new Date("2024-01-01T00:00:00.000Z"),
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastFailedLogin: null,
    passwordChangedAt: new Date("2024-01-01T00:00:00.000Z"),
    ...userOverrides,
    profile: createProfileFixture({
      userId,
      ...profileOverrides,
    }),
  };
}

/**
 * Creates a soft-deleted profile fixture
 */
export function createDeletedProfileFixture(
  overrides: Partial<Profile> = {},
): Profile {
  return createProfileFixture({
    deleted: true,
    deletedAt: new Date("2024-06-15T12:00:00.000Z"),
    ...overrides,
  });
}

/**
 * Pre-configured fixtures for common test scenarios
 */
export const PROFILE_FIXTURES = {
  empty: createProfileFixture(),
  complete: createCompleteProfileFixture(),
  withPhoto: createProfileFixture({
    photoUrl: "https://example.com/avatar.png",
  }),
  withAddress: createProfileFixture({
    address: "456 Oak Avenue, Town",
  }),
  deleted: createDeletedProfileFixture(),
};
