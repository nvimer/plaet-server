import { PrismaClient, TokenType } from "@prisma/client";
import { TestTokenRepository } from "./test-token-repository";
import {
  connectTestDatabase,
  disconnectTestDatabase,
  getTestDatabaseClient,
} from "../../../../../tests/shared/test-database";

describe("Token Repository Integration Tests", () => {
  let tokenRepository: TestTokenRepository;
  let testUser: Awaited<ReturnType<PrismaClient["user"]["create"]>>;
  const testPrisma = getTestDatabaseClient();

  beforeAll(async () => {
    await connectTestDatabase();

    // Create test user
    testUser = await testPrisma.user.create({
      data: {
        firstName: "Test",
        lastName: "User",
        email: `test-${Date.now()}@example.com`,
        password: "hashedpassword",
        restaurantId: null,
      },
    });

    // Initialize repository
    tokenRepository = new TestTokenRepository(testPrisma);
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    // Clean tokens before each test
    await tokenRepository.deleteAll();
  });

  describe("Token Creation", () => {
    test("should create access token successfully", async () => {
      const tokenData = {
        token:
          Math.random().toString(36).substring(2, 15) +
          Math.random().toString(36).substring(2, 15),
        type: TokenType.ACCESS,
        expires: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
        userId: testUser.id,
      };

      const token = await tokenRepository.create(tokenData);

      expect(token.id).toBeDefined();
      expect(token.token).toBe(tokenData.token);
      expect(token.type).toBe(TokenType.ACCESS);
      expect(token.userId).toBe(testUser.id);
      expect(token.blacklisted).toBe(false);
      expect(token.expires).toBeInstanceOf(Date);
    });

    test("should create refresh token successfully", async () => {
      const tokenData = {
        token:
          Math.random().toString(36).substring(2, 15) +
          Math.random().toString(36).substring(2, 15),
        type: TokenType.REFRESH,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        userId: testUser.id,
      };

      const token = await tokenRepository.create(tokenData);

      expect(token.type).toBe(TokenType.REFRESH);
      expect(token.expires.getTime()).toBeGreaterThan(Date.now());
    });

    test("should create reset password token successfully", async () => {
      const tokenData = {
        token:
          Math.random().toString(36).substring(2, 15) +
          Math.random().toString(36).substring(2, 15),
        type: TokenType.RESET_PASSWORD,
        expires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        userId: testUser.id,
      };

      const token = await tokenRepository.create(tokenData);

      expect(token.type).toBe(TokenType.RESET_PASSWORD);
    });

    test("should create verify email token successfully", async () => {
      const tokenData = {
        token:
          Math.random().toString(36).substring(2, 15) +
          Math.random().toString(36).substring(2, 15),
        type: TokenType.VERIFY_EMAIL,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        userId: testUser.id,
      };

      const token = await tokenRepository.create(tokenData);

      expect(token.type).toBe(TokenType.VERIFY_EMAIL);
    });

    test("should create blacklisted token when specified", async () => {
      const tokenData = {
        token:
          Math.random().toString(36).substring(2, 15) +
          Math.random().toString(36).substring(2, 15),
        type: TokenType.ACCESS,
        expires: new Date(Date.now() + 30 * 60 * 1000),
        userId: testUser.id,
        blacklisted: true,
      };

      const token = await tokenRepository.create(tokenData);

      expect(token.blacklisted).toBe(true);
    });
  });

  describe("Token Retrieval", () => {
    test("should find token by token string", async () => {
      const tokenString =
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
      const tokenData = {
        token: tokenString,
        type: TokenType.ACCESS,
        expires: new Date(Date.now() + 30 * 60 * 1000),
        userId: testUser.id,
      };

      await tokenRepository.create(tokenData);

      const foundToken = await tokenRepository.findByToken(tokenString);

      expect(foundToken).not.toBeNull();
      expect(foundToken?.token).toBe(tokenString);
      expect(foundToken?.type).toBe(TokenType.ACCESS);
    });

    test("should return null for non-existent token", async () => {
      const foundToken =
        await tokenRepository.findByToken("non-existent-token");
      expect(foundToken).toBeNull();
    });

    test("should find tokens by user ID", async () => {
      const tokenData1 = {
        token:
          Math.random().toString(36).substring(2, 15) +
          Math.random().toString(36).substring(2, 15),
        type: TokenType.ACCESS,
        expires: new Date(Date.now() + 30 * 60 * 1000),
        userId: testUser.id,
      };

      const tokenData2 = {
        token:
          Math.random().toString(36).substring(2, 15) +
          Math.random().toString(36).substring(2, 15),
        type: TokenType.REFRESH,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userId: testUser.id,
      };

      await tokenRepository.create(tokenData1);
      await tokenRepository.create(tokenData2);

      const userTokens = await tokenRepository.findByUserId(testUser.id);

      expect(userTokens).toHaveLength(2);
      expect(userTokens.map((t) => t.type)).toContain(TokenType.ACCESS);
      expect(userTokens.map((t) => t.type)).toContain(TokenType.REFRESH);
    });

    test("should find tokens by type", async () => {
      const tokenData1 = {
        token:
          Math.random().toString(36).substring(2, 15) +
          Math.random().toString(36).substring(2, 15),
        type: TokenType.ACCESS,
        expires: new Date(Date.now() + 30 * 60 * 1000),
        userId: testUser.id,
      };

      const tokenData2 = {
        token:
          Math.random().toString(36).substring(2, 15) +
          Math.random().toString(36).substring(2, 15),
        type: TokenType.ACCESS,
        expires: new Date(Date.now() + 30 * 60 * 1000),
        userId: testUser.id,
      };

      const refreshTokenData = {
        token:
          Math.random().toString(36).substring(2, 15) +
          Math.random().toString(36).substring(2, 15),
        type: TokenType.REFRESH,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userId: testUser.id,
      };

      await tokenRepository.create(tokenData1);
      await tokenRepository.create(tokenData2);
      await tokenRepository.create(refreshTokenData);

      const accessTokens = await tokenRepository.findByType(TokenType.ACCESS);

      expect(accessTokens).toHaveLength(2);
      accessTokens.forEach((token) => {
        expect(token.type).toBe(TokenType.ACCESS);
      });
    });
  });

  describe("Token Updates", () => {
    test("should blacklist token successfully", async () => {
      const tokenData = {
        token:
          Math.random().toString(36).substring(2, 15) +
          Math.random().toString(36).substring(2, 15),
        type: TokenType.ACCESS,
        expires: new Date(Date.now() + 30 * 60 * 1000),
        userId: testUser.id,
      };

      const token = await tokenRepository.create(tokenData);
      expect(token.blacklisted).toBe(false);

      const updatedToken = await tokenRepository.blacklist(token.id);

      expect(updatedToken.blacklisted).toBe(true);
    });

    test("should update token expiration", async () => {
      const tokenData = {
        token:
          Math.random().toString(36).substring(2, 15) +
          Math.random().toString(36).substring(2, 15),
        type: TokenType.ACCESS,
        expires: new Date(Date.now() + 30 * 60 * 1000),
        userId: testUser.id,
      };

      const token = await tokenRepository.create(tokenData);
      const newExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      const updatedToken = await tokenRepository.update(token.id, {
        expires: newExpires,
      });

      expect(updatedToken.expires.getTime()).toBe(newExpires.getTime());
    });
  });

  describe("Token Deletion", () => {
    test("should delete token by ID", async () => {
      const tokenData = {
        token:
          Math.random().toString(36).substring(2, 15) +
          Math.random().toString(36).substring(2, 15),
        type: TokenType.ACCESS,
        expires: new Date(Date.now() + 30 * 60 * 1000),
        userId: testUser.id,
      };

      const token = await tokenRepository.create(tokenData);
      expect(token.id).toBeDefined();

      await tokenRepository.delete(token.id);

      const foundToken = await tokenRepository.findByToken(tokenData.token);
      expect(foundToken).toBeNull();
    });

    test("should delete tokens by user ID", async () => {
      const tokenData1 = {
        token:
          Math.random().toString(36).substring(2, 15) +
          Math.random().toString(36).substring(2, 15),
        type: TokenType.ACCESS,
        expires: new Date(Date.now() + 30 * 60 * 1000),
        userId: testUser.id,
      };

      const tokenData2 = {
        token:
          Math.random().toString(36).substring(2, 15) +
          Math.random().toString(36).substring(2, 15),
        type: TokenType.REFRESH,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userId: testUser.id,
      };

      await tokenRepository.create(tokenData1);
      await tokenRepository.create(tokenData2);

      const userTokensBefore = await tokenRepository.findByUserId(testUser.id);
      expect(userTokensBefore).toHaveLength(2);

      await tokenRepository.deleteByUserId(testUser.id);

      const userTokensAfter = await tokenRepository.findByUserId(testUser.id);
      expect(userTokensAfter).toHaveLength(0);
    });

    test("should delete expired tokens", async () => {
      const expiredTokenData = {
        token:
          Math.random().toString(36).substring(2, 15) +
          Math.random().toString(36).substring(2, 15),
        type: TokenType.ACCESS,
        expires: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        userId: testUser.id,
      };

      const validTokenData = {
        token:
          Math.random().toString(36).substring(2, 15) +
          Math.random().toString(36).substring(2, 15),
        type: TokenType.ACCESS,
        expires: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
        userId: testUser.id,
      };

      await tokenRepository.create(expiredTokenData);
      await tokenRepository.create(validTokenData);

      const deletedCount = await tokenRepository.deleteExpired();

      expect(deletedCount).toBe(1);

      const allTokens = await tokenRepository.findByUserId(testUser.id);
      expect(allTokens).toHaveLength(1);
      expect(allTokens[0].token).toBe(validTokenData.token);
    });
  });

  describe("Token Validation", () => {
    test("should validate valid token", async () => {
      const tokenData = {
        token:
          Math.random().toString(36).substring(2, 15) +
          Math.random().toString(36).substring(2, 15),
        type: TokenType.ACCESS,
        expires: new Date(Date.now() + 30 * 60 * 1000),
        userId: testUser.id,
      };

      await tokenRepository.create(tokenData);

      const isValid = await tokenRepository.isValid(tokenData.token);
      expect(isValid).toBe(true);
    });

    test("should invalidate blacklisted token", async () => {
      const tokenData = {
        token:
          Math.random().toString(36).substring(2, 15) +
          Math.random().toString(36).substring(2, 15),
        type: TokenType.ACCESS,
        expires: new Date(Date.now() + 30 * 60 * 1000),
        userId: testUser.id,
      };

      const token = await tokenRepository.create(tokenData);
      await tokenRepository.blacklist(token.id);

      const isValid = await tokenRepository.isValid(tokenData.token);
      expect(isValid).toBe(false);
    });

    test("should invalidate expired token", async () => {
      const tokenData = {
        token:
          Math.random().toString(36).substring(2, 15) +
          Math.random().toString(36).substring(2, 15),
        type: TokenType.ACCESS,
        expires: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        userId: testUser.id,
      };

      await tokenRepository.create(tokenData);

      const isValid = await tokenRepository.isValid(tokenData.token);
      expect(isValid).toBe(false);
    });

    test("should invalidate non-existent token", async () => {
      const isValid = await tokenRepository.isValid("non-existent-token");
      expect(isValid).toBe(false);
    });
  });

  describe("Token Counting and Analytics", () => {
    test("should count all tokens", async () => {
      await tokenRepository.createTestTokens(testUser.id, 3);

      const count = await tokenRepository.count();
      expect(count).toBe(3);
    });

    test("should count tokens by type", async () => {
      const otherUser = await testPrisma.user.create({
        data: {
          firstName: `Test${Math.random().toString().substring(2, 8)}`,
          lastName: `User${Math.random().toString().substring(2, 8)}`,
          email: `test${Math.random().toString().substring(2, 8)}@example.com`,
          password: "hashedpassword",
          restaurantId: null,
        },
      });

      // Create tokens of different types
      await tokenRepository.create({
        token:
          Math.random().toString(36).substring(2, 15) +
          Math.random().toString(36).substring(2, 15),
        type: TokenType.ACCESS,
        expires: new Date(Date.now() + 30 * 60 * 1000),
        userId: testUser.id,
      });

      await tokenRepository.create({
        token:
          Math.random().toString(36).substring(2, 15) +
          Math.random().toString(36).substring(2, 15),
        type: TokenType.ACCESS,
        expires: new Date(Date.now() + 30 * 60 * 1000),
        userId: otherUser.id,
      });

      await tokenRepository.create({
        token:
          Math.random().toString(36).substring(2, 15) +
          Math.random().toString(36).substring(2, 15),
        type: TokenType.REFRESH,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userId: testUser.id,
      });

      const accessTokenCount = await tokenRepository.countByType(
        TokenType.ACCESS,
      );
      const refreshTokenCount = await tokenRepository.countByType(
        TokenType.REFRESH,
      );

      expect(accessTokenCount).toBe(2);
      expect(refreshTokenCount).toBe(1);
    });

    test("should count expired and blacklisted tokens", async () => {
      // Create valid token
      await tokenRepository.create({
        token:
          Math.random().toString(36).substring(2, 15) +
          Math.random().toString(36).substring(2, 15),
        type: TokenType.ACCESS,
        expires: new Date(Date.now() + 30 * 60 * 1000),
        userId: testUser.id,
      });

      // Create expired token
      await tokenRepository.createExpiredToken(testUser.id);

      // Create blacklisted token
      await tokenRepository.createBlacklistedToken(testUser.id);

      const expiredCount = await tokenRepository.countExpired();
      const blacklistedCount = await tokenRepository.countBlacklisted();

      expect(expiredCount).toBe(1);
      expect(blacklistedCount).toBe(1);
    });
  });

  describe("Helper Methods", () => {
    test("should create test tokens helper method", async () => {
      const tokens = await tokenRepository.createTestTokens(testUser.id, 5);

      expect(tokens).toHaveLength(5);
      expect(await tokenRepository.count()).toBe(5);

      // Verify all tokens belong to the test user
      const userTokens = await tokenRepository.findByUserId(testUser.id);
      expect(userTokens).toHaveLength(5);
    });

    test("should create expired token helper method", async () => {
      const expiredToken = await tokenRepository.createExpiredToken(
        testUser.id,
      );

      expect(expiredToken.expires.getTime()).toBeLessThan(Date.now());
      expect(await tokenRepository.countExpired()).toBe(1);
    });

    test("should create blacklisted token helper method", async () => {
      const blacklistedToken = await tokenRepository.createBlacklistedToken(
        testUser.id,
      );

      expect(blacklistedToken.blacklisted).toBe(true);
      expect(await tokenRepository.countBlacklisted()).toBe(1);
    });

    test("should delete all tokens helper method", async () => {
      await tokenRepository.createTestTokens(testUser.id, 3);
      expect(await tokenRepository.count()).toBe(3);

      await tokenRepository.deleteAll();
      expect(await tokenRepository.count()).toBe(0);
    });
  });
});
