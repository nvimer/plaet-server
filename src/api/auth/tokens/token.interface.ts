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
}
