import jwt from "jsonwebtoken";
import moment, { Moment } from "moment";
import {
  TokenRepositoryInterface,
  TokenServiceInterface,
} from "./token.interface";
import { AuthTokenResponseInput, PayloadInput } from "./token.validation";
import { Token, TokenType } from "@prisma/client";
import { config } from "../../../config";
import tokenRepository from "./token.repository";

/**
 * Token Service
 *
 * The service follows the dependency injection pattern and
 * implements the TokenServiceInterface for consistency.
 */
export class TokenService implements TokenServiceInterface {
  constructor(private tokenRepository: TokenRepositoryInterface) {}

  /**
   * Generates a JWT token with the specified parameters.
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
    const payload: PayloadInput = {
      sub: id,
      iat: moment().unix(),
      exp: expires.unix(),
      type,
      token: "", // Will be set after signing
    };
    // sign the transaction with payload values and secret value
    const token = jwt.sign(payload, secret);
    // Update payload with the generated token for blacklisting reference
    payload.token = token;
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
   * the refresh token to the database, and returns the token pair.
   *
   * Token Generation Process:
   * - Creates access token with short expiration (minutes)
   * - Creates refresh token with long expiration (days)
   * - Saves refresh token to database for tracking
   * - Returns both tokens with expiration information
   *
   * Token Configuration:
   * - Access token: Short-lived for API authentication
   * - Refresh token: Long-lived for session renewal
   * - Expiration times configured via environment variables
   * - Refresh tokens stored for revocation capability
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

    await this.saveToken(
      id,
      refreshToken,
      TokenType.REFRESH,
      refreshTokenExpires,
    );
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
    await this.tokenRepository.blacklistAllUserTokens(userId);
  }

  /**
   * Checks if a token is blacklisted
   *
   * @param token - Token string to check
   * @returns true if token is blacklisted, false otherwise
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    const tokenRecord = await this.tokenRepository.findByToken(token);
    return tokenRecord?.blacklisted || false;
  }
}

export default new TokenService(tokenRepository);
