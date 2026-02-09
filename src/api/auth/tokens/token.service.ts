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
    id: string,
    expires: Moment,
    type: TokenType,
    secret: string = config.jwtSecret,
  ): string {
    // create a personalize payload where save necessary values for token in auth user.
    const payload = {
      sub: id,
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
  async generateAuthToken(id: string): Promise<AuthTokenResponseInput> {
    const accessTokenExpires = moment().add(
      config.jwtAccessExpirationMinutes,
      "minutes",
    );
    const accessToken = this.generateToken(
      id,
      accessTokenExpires,
      TokenType.ACCESS,
    );

    const refreshTokenExpires = moment().add(
      config.jwtAccessExpirationDays,
      "days",
    );

    const refreshToken = this.generateToken(
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
}

export default new TokenService(tokenRepository);
