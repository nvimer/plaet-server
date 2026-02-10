import { Token, TokenType } from "@prisma/client";
import { AuthTokenResponseInput } from "./token.validation";
import { Moment } from "moment";

/**
 * Token Service Interface
 */
export interface TokenServiceInterface {
  generateAuthToken(id: string): Promise<AuthTokenResponseInput>;
  logout(userId: string): Promise<void>;
  isTokenBlacklisted(token: string): Promise<boolean>;
  generatePasswordResetToken(userId: string): Promise<string>;
  verifyPasswordResetToken(
    token: string,
  ): Promise<{ userId: string | null; isValid: boolean }>;
  blacklistToken(token: string): Promise<void>;
  generateEmailVerificationToken(userId: string): Promise<string>;
  verifyEmailVerificationToken(
    token: string,
  ): Promise<{ userId: string | null; isValid: boolean }>;
  refreshTokens(refreshToken: string): Promise<AuthTokenResponseInput | null>;
  validateRefreshToken(refreshToken: string): Promise<string | null>;
}

/**
 * Token Repository Interface
 */
export interface TokenRepositoryInterface {
  saveToken(
    id: string,
    token: string,
    type: TokenType,
    expires: Moment,
    blacklisted: boolean,
  ): Promise<Token>;

  deleteRefreshTokenByUserId(userId: string): Promise<number>;
  blacklistAllUserTokens(userId: string): Promise<number>;
  findByToken(token: string): Promise<Token | null>;
  blacklistToken(token: string): Promise<void>;
}
