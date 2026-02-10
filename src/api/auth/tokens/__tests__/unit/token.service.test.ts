import { TokenType } from "@prisma/client";
import { TokenService } from "../../token.service";
import { TokenRepositoryInterface } from "../../token.interface";
import { createMockTokenRepository } from "../helpers";
import { createTokenFixture } from "../helpers/token.fixtures";
import jwt from "jsonwebtoken";

// Mock dependencies
jest.mock("jsonwebtoken", () => ({
  sign: jest.fn(),
}));

jest.mock("moment", () => {
  const actualMoment = jest.requireActual("moment");
  return jest.fn((input?: string | Date) => {
    const momentInstance = actualMoment(input);
    return {
      ...momentInstance,
      add: jest.fn().mockReturnThis(),
      unix: jest.fn().mockReturnValue(1234567890),
      toDate: jest.fn().mockReturnValue(new Date("2024-01-01T00:00:00.000Z")),
    };
  });
});

jest.mock("../../../../../config", () => ({
  config: {
    jwtSecret: "test-secret-key",
    jwtAccessExpirationMinutes: 15,
    jwtAccessExpirationDays: 7,
  },
}));

describe("TokenService - Unit Tests", () => {
  let tokenService: TokenService;
  let mockTokenRepository: jest.Mocked<TokenRepositoryInterface>;

  beforeEach(() => {
    mockTokenRepository = createMockTokenRepository();
    tokenService = new TokenService(mockTokenRepository);
    jest.clearAllMocks();
  });

  describe("generateAuthToken", () => {
    it("should generate access and refresh tokens when valid user ID provided", async () => {
      // Arrange
      const userId = "user-123";
      const accessToken = "access-token-string";
      const refreshToken = "refresh-token-string";
      const savedToken = createTokenFixture({
        userId,
        token: refreshToken,
        type: TokenType.REFRESH,
      });

      (jwt.sign as jest.Mock).mockReturnValueOnce(accessToken);
      (jwt.sign as jest.Mock).mockReturnValueOnce(refreshToken);
      mockTokenRepository.saveToken.mockResolvedValue(savedToken);

      // Act
      const result = await tokenService.generateAuthToken(userId);

      // Assert
      expect(jwt.sign).toHaveBeenCalledTimes(2);
      expect(mockTokenRepository.saveToken).toHaveBeenCalledWith(
        userId,
        refreshToken,
        TokenType.REFRESH,
        expect.anything(),
        false,
      );
      expect(result.access.token).toBe(accessToken);
      expect(result.refresh.token).toBe(refreshToken);
      expect(result.access.expires).toBeDefined();
      expect(result.refresh.expires).toBeDefined();
    });

    it("should generate access token with correct expiration time", async () => {
      // Arrange
      const userId = "user-123";
      const accessToken = "access-token";
      const refreshToken = "refresh-token";
      const savedToken = createTokenFixture();

      (jwt.sign as jest.Mock).mockReturnValueOnce(accessToken);
      (jwt.sign as jest.Mock).mockReturnValueOnce(refreshToken);
      mockTokenRepository.saveToken.mockResolvedValue(savedToken);

      // Act
      await tokenService.generateAuthToken(userId);

      // Assert
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: userId,
          type: TokenType.ACCESS,
        }),
        "test-secret-key",
      );
    });

    it("should generate refresh token with correct expiration time", async () => {
      // Arrange
      const userId = "user-123";
      const accessToken = "access-token";
      const refreshToken = "refresh-token";
      const savedToken = createTokenFixture();

      (jwt.sign as jest.Mock).mockReturnValueOnce(accessToken);
      (jwt.sign as jest.Mock).mockReturnValueOnce(refreshToken);
      mockTokenRepository.saveToken.mockResolvedValue(savedToken);

      // Act
      await tokenService.generateAuthToken(userId);

      // Assert
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: userId,
          type: TokenType.REFRESH,
        }),
        "test-secret-key",
      );
    });

    it("should save refresh token to database", async () => {
      // Arrange
      const userId = "user-123";
      const accessToken = "access-token";
      const refreshToken = "refresh-token";
      const savedToken = createTokenFixture({
        userId,
        token: refreshToken,
        type: TokenType.REFRESH,
      });

      (jwt.sign as jest.Mock).mockReturnValueOnce(accessToken);
      (jwt.sign as jest.Mock).mockReturnValueOnce(refreshToken);
      mockTokenRepository.saveToken.mockResolvedValue(savedToken);

      // Act
      await tokenService.generateAuthToken(userId);

      // Assert - Both access and refresh tokens are saved
      expect(mockTokenRepository.saveToken).toHaveBeenCalledTimes(2);
      expect(mockTokenRepository.saveToken).toHaveBeenNthCalledWith(
        1,
        userId,
        accessToken,
        TokenType.ACCESS,
        expect.any(Object),
        false,
      );
      expect(mockTokenRepository.saveToken).toHaveBeenNthCalledWith(
        2,
        userId,
        refreshToken,
        TokenType.REFRESH,
        expect.any(Object),
        false,
      );
    });

    it("should include correct payload structure in JWT tokens", async () => {
      // Arrange
      const userId = "user-123";
      const accessToken = "access-token";
      const refreshToken = "refresh-token";
      const savedToken = createTokenFixture();

      (jwt.sign as jest.Mock).mockReturnValueOnce(accessToken);
      (jwt.sign as jest.Mock).mockReturnValueOnce(refreshToken);
      mockTokenRepository.saveToken.mockResolvedValue(savedToken);

      // Act
      await tokenService.generateAuthToken(userId);

      // Assert
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: userId,
          iat: expect.any(Number),
          exp: expect.any(Number),
          type: TokenType.ACCESS,
        }),
        "test-secret-key",
      );

      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: userId,
          iat: expect.any(Number),
          exp: expect.any(Number),
          type: TokenType.REFRESH,
        }),
        "test-secret-key",
      );
    });

    it("should throw error when token repository fails to save", async () => {
      // Arrange
      const userId = "user-123";
      const accessToken = "access-token";
      const refreshToken = "refresh-token";

      (jwt.sign as jest.Mock).mockReturnValueOnce(accessToken);
      (jwt.sign as jest.Mock).mockReturnValueOnce(refreshToken);
      mockTokenRepository.saveToken.mockRejectedValue(
        new Error("Database error"),
      );

      // Act & Assert
      await expect(tokenService.generateAuthToken(userId)).rejects.toThrow(
        "Database error",
      );
    });
  });

  describe("logout", () => {
    it("should blacklist all tokens for user when valid user ID provided", async () => {
      // Arrange
      const userId = "user-123";
      mockTokenRepository.blacklistAllUserTokens.mockResolvedValue(2);

      // Act
      await tokenService.logout(userId);

      // Assert
      expect(mockTokenRepository.blacklistAllUserTokens).toHaveBeenCalledWith(
        userId,
      );
      expect(mockTokenRepository.blacklistAllUserTokens).toHaveBeenCalledTimes(
        1,
      );
    });

    it("should handle case when no tokens exist for user", async () => {
      // Arrange
      const userId = "user-123";
      mockTokenRepository.blacklistAllUserTokens.mockResolvedValue(0);

      // Act
      await tokenService.logout(userId);

      // Assert
      expect(mockTokenRepository.blacklistAllUserTokens).toHaveBeenCalledWith(
        userId,
      );
    });

    it("should throw error when token repository fails to blacklist", async () => {
      // Arrange
      const userId = "user-123";
      mockTokenRepository.blacklistAllUserTokens.mockRejectedValue(
        new Error("Database error"),
      );

      // Act & Assert
      await expect(tokenService.logout(userId)).rejects.toThrow(
        "Database error",
      );
    });
  });
});
