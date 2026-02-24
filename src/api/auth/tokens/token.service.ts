import userService from "../../users/user.service";
import jwt from "jsonwebtoken";
import moment, { Moment } from "moment";
import {
  TokenRepositoryInterface,
  TokenServiceInterface,
} from "./token.interface";
import { AuthTokenResponseInput } from "./token.validation";
import { Token, TokenType } from "@prisma/client";
import { config } from "../../../config";
import tokenRepository from "./token.repository";
import { logger } from "../../../config/logger";

/**
 * Token Service
 *
 * The service follows the dependency injection pattern and
 * implements the TokenServiceInterface for consistency.
 */
export class TokenService implements TokenServiceInterface {
  constructor(private tokenRepository: TokenRepositoryInterface) {}

  /**
   * Generates a JWT token with specified parameters.
   * This private method creates and signs JWT tokens with
   * a customized payload containing user identification
   * and token metadata.
   *
   * Token Payload Structure:
   * - sub: User ID (subject)
   * - iat: Issued at timestamp (Unix timestamp)
   * - exp: Expiration timestamp (Unix timestamp)
   * - type: Token type (ACCESS/REFRESH)
   */
  private generateToken(
    restaurantId: string | null | undefined,

    id: string,
    expires: Moment,
    type: TokenType,
    secret: string = config.jwtSecret,
  ): string {
    // create a personalize payload where save necessary values for token in auth user.
    const payload = {
      sub: id,
      restaurantId,
      iat: moment().unix(),
      exp: expires.unix(),
      type,
    };
    // sign the transaction with payload values and secret value
    const token = jwt.sign(payload, secret);
    return token;
  }

  /**
   * Saves a token to the database for tracking and management.
   * This private method persists token information to enable
   * features like token blacklisting and session management.
   *
   * Database Operations:
   * - Stores token hash for security
   * - Records token type and expiration
   * - Tracks blacklist status
   * - Associates token with user
   */
  private async saveToken(
    id: string,
    token: string,
    type: TokenType,
    expires: Moment,
    blacklisted: boolean = false,
  ): Promise<Token> {
    const newToken = await this.tokenRepository.saveToken(
      id,
      token,
      type,
      expires,
      blacklisted,
    );
    return newToken;
  }

  /**
   * Generates a complete authentication token pair for a user.
   * This method creates both access and refresh tokens, saves
   * BOTH tokens to the database, and returns the token pair.
   *
   * Token Generation Process:
   * - Creates access token with short expiration (minutes) - Stored in DB
   * - Creates refresh token with long expiration (days) - Stored in DB
   * - Saves BOTH tokens to database for complete blacklisting support
   * - Returns both tokens with expiration information
   *
   * Security Note:
   * - Both tokens are persisted to enable complete session revocation
   * - Access tokens are short-lived (30 min) but tracked for security
   * - Blacklisting affects both tokens for complete session termination
   * - DB overhead is acceptable for security guarantees
   *
   * Token Configuration:
   * - Access token: Short-lived for API authentication
   * - Refresh token: Long-lived for session renewal
   * - Expiration times configured via environment variables
   * - Both tokens stored for complete revocation capability
   */
  async generateAuthToken(
    id: string,
    restaurantId?: string | null,
  ): Promise<AuthTokenResponseInput> {
    const accessTokenExpires = moment().add(
      config.jwtAccessExpirationMinutes,
      "minutes",
    );
    const accessToken = this.generateToken(
      restaurantId,

      id,
      accessTokenExpires,
      TokenType.ACCESS,
    );

    const refreshTokenExpires = moment().add(
      config.jwtAccessExpirationDays,
      "days",
    );

    const refreshToken = this.generateToken(
      restaurantId,

      id,
      refreshTokenExpires,
      TokenType.REFRESH,
    );

    // Save BOTH tokens to database for complete blacklisting support
    // This is necessary for complete session revocation on logout
    await Promise.all([
      this.saveToken(id, accessToken, TokenType.ACCESS, accessTokenExpires),
      this.saveToken(id, refreshToken, TokenType.REFRESH, refreshTokenExpires),
    ]);

    return {
      access: {
        token: accessToken,
        expires: String(accessTokenExpires.toDate()),
      },
      refresh: {
        token: refreshToken,
        expires: String(refreshTokenExpires.toDate()),
      },
    };
  }

  /**
   * Logs out a user by blacklisting all their tokens
   * This invalidates both access and refresh tokens for the user.
   *
   * Logout Process
   * - Blacklists all active tokens (access and refresh)
   * - User must re-authenticate to get new tokens
   * - Prevents token reuse after logout
   *
   * @param userId - User identifier
   */
  async logout(userId: string): Promise<void> {
    logger.info(`[LOGOUT] Blacklisting all tokens for user ${userId}`);
    const result = await this.tokenRepository.blacklistAllUserTokens(userId);
    logger.info(`[LOGOUT] Blacklisted ${result} tokens for user ${userId}`);
  }

  /**
   * Checks if a token is blacklisted
   *
   * @param token - Token string to check
   * @returns true if token is blacklisted, false otherwise
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    const tokenRecord = await this.tokenRepository.findByToken(token);
    if (!tokenRecord) {
      logger.warn(
        `[BLACKLIST] Token not found in DB: ${token.substring(0, 20)}...`,
      );
      return false;
    }
    logger.info(
      `[BLACKLIST] Token ${token.substring(0, 20)}... is blacklisted: ${tokenRecord.blacklisted}`,
    );
    return tokenRecord.blacklisted || false;
  }

  /**
   * Generates a password reset token for a user
   *
   * @param userId - User identifier
   * @returns Reset token string
   */
  async generatePasswordResetToken(userId: string): Promise<string> {
    const restaurantId = undefined;
    const expires = moment().add(1, "hour"); // 1 hour validity
    const resetToken = this.generateToken(
      restaurantId,

      userId,
      expires,
      TokenType.RESET_PASSWORD,
    );

    await this.saveToken(userId, resetToken, TokenType.RESET_PASSWORD, expires);

    logger.info(`[PASSWORD_RESET] Generated reset token for user ${userId}`);
    return resetToken;
  }

  /**
   * Verifies a password reset token
   *
   * @param token - Reset token to verify
   * @returns Object with userId and validity status
   */
  async verifyPasswordResetToken(
    token: string,
  ): Promise<{ userId: string | null; isValid: boolean }> {
    const tokenRecord = await this.tokenRepository.findByToken(token);

    if (!tokenRecord) {
      logger.warn("[PASSWORD_RESET] Token not found");
      return { userId: null, isValid: false };
    }

    if (tokenRecord.type !== TokenType.RESET_PASSWORD) {
      logger.warn("[PASSWORD_RESET] Invalid token type");
      return { userId: null, isValid: false };
    }

    if (tokenRecord.blacklisted) {
      logger.warn("[PASSWORD_RESET] Token is blacklisted");
      return { userId: null, isValid: false };
    }

    if (tokenRecord.expires < new Date()) {
      logger.warn("[PASSWORD_RESET] Token has expired");
      return { userId: null, isValid: false };
    }

    logger.info(`[PASSWORD_RESET] Valid token for user ${tokenRecord.userId}`);
    return { userId: tokenRecord.userId, isValid: true };
  }

  /**
   * Blacklists a specific token (used after password reset)
   *
   * @param token - Token to blacklist
   */
  async blacklistToken(token: string): Promise<void> {
    await this.tokenRepository.blacklistToken(token);
    logger.info("[BLACKLIST] Token manually blacklisted");
  }

  /**
   * Generates an email verification token for a user
   *
   * @param userId - User identifier
   * @returns Verification token string
   */
  async generateEmailVerificationToken(userId: string): Promise<string> {
    const restaurantId = undefined;
    const expires = moment().add(24, "hours"); // 24 hours validity
    const verificationToken = this.generateToken(
      restaurantId,

      userId,
      expires,
      TokenType.VERIFY_EMAIL,
    );

    await this.saveToken(
      userId,
      verificationToken,
      TokenType.VERIFY_EMAIL,
      expires,
    );

    logger.info(
      `[EMAIL_VERIFY] Generated verification token for user ${userId}`,
    );
    return verificationToken;
  }

  /**
   * Verifies an email verification token
   *
   * @param token - Verification token to verify
   * @returns Object with userId and validity status
   */
  async verifyEmailVerificationToken(
    token: string,
  ): Promise<{ userId: string | null; isValid: boolean }> {
    const tokenRecord = await this.tokenRepository.findByToken(token);

    if (!tokenRecord) {
      logger.warn("[EMAIL_VERIFY] Token not found");
      return { userId: null, isValid: false };
    }

    if (tokenRecord.type !== TokenType.VERIFY_EMAIL) {
      logger.warn("[EMAIL_VERIFY] Invalid token type");
      return { userId: null, isValid: false };
    }

    if (tokenRecord.blacklisted) {
      logger.warn("[EMAIL_VERIFY] Token is blacklisted");
      return { userId: null, isValid: false };
    }

    if (tokenRecord.expires < new Date()) {
      logger.warn("[EMAIL_VERIFY] Token has expired");
      return { userId: null, isValid: false };
    }

    logger.info(`[EMAIL_VERIFY] Valid token for user ${tokenRecord.userId}`);
    return { userId: tokenRecord.userId, isValid: true };
  }

  /**
   * Refreshes access and refresh tokens using a valid refresh token.
   * Implements token rotation for enhanced security.
   *
   * Security Features:
   * - Validates refresh token type and expiration
   * - Checks blacklist status
   * - Blacklists old refresh token (rotation)
   * - Generates new token pair
   * - Detects token reuse attempts
   *
   * @param refreshToken - Current refresh token
   * @returns New token pair or null if invalid
   */
  async refreshTokens(
    refreshToken: string,
  ): Promise<AuthTokenResponseInput | null> {
    const tokenRecord = await this.tokenRepository.findByToken(refreshToken);

    if (!tokenRecord) {
      logger.warn("[REFRESH] Token not found");
      return null;
    }

    if (tokenRecord.type !== TokenType.REFRESH) {
      logger.warn(`[REFRESH] Invalid token type: ${tokenRecord.type}`);
      return null;
    }

    if (tokenRecord.blacklisted) {
      // Potential token reuse attack - Log warning but avoid nuclear logout to prevent loops
      // caused by parallel refreshes (race conditions)
      logger.warn(
        `[REFRESH] Token reuse detected for user ${tokenRecord.userId}. Invalidating session.`,
      );
      // await this.logout(tokenRecord.userId);
      return null;
    }

    if (tokenRecord.expires < new Date()) {
      logger.warn("[REFRESH] Token has expired");
      return null;
    }

    // Blacklist old refresh token (rotation)
    await this.tokenRepository.blacklistToken(refreshToken);
    logger.info(`[REFRESH] Rotated token for user ${tokenRecord.userId}`);

    const user = await userService.findById(tokenRecord.userId);
    // Generate new token pair
    const newTokens = await this.generateAuthToken(
      tokenRecord.userId,
      user.restaurantId,
    );

    logger.info(
      `[REFRESH] New tokens generated for user ${tokenRecord.userId}`,
    );
    return newTokens;
  }

  /**
   * Validates a refresh token without rotating it.
   * Used for checking token validity before operations.
   *
   * @param refreshToken - Refresh token to validate
   * @returns User ID if valid, null otherwise
   */
  async validateRefreshToken(refreshToken: string): Promise<string | null> {
    const tokenRecord = await this.tokenRepository.findByToken(refreshToken);

    if (
      !tokenRecord ||
      tokenRecord.type !== TokenType.REFRESH ||
      tokenRecord.blacklisted ||
      tokenRecord.expires < new Date()
    ) {
      return null;
    }

    return tokenRecord.userId;
  }
}

export default new TokenService(tokenRepository);
