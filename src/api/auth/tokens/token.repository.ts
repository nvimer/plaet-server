import { Token, TokenType } from "@prisma/client";
import prisma from "../../../database/prisma";
import { TokenRepositoryInterface } from "./token.interface";
import moment, { Moment } from "moment";

/**
 * Token Repository
 */
class TokenRepository implements TokenRepositoryInterface {
  async saveToken(
    id: string,
    token: string,
    type: TokenType,
    expires: Moment = moment.utc(),
    blacklisted: boolean = false,
  ): Promise<Token> {
    return await prisma.token.create({
      data: {
        userId: id,
        token,
        type,
        expires: expires.toDate(),
        blacklisted,
      },
    });
  }

  async deleteRefreshTokenByUserId(userId: string): Promise<number> {
    const result = await prisma.token.deleteMany({
      where: {
        userId,
        type: TokenType.REFRESH,
      },
    });
    return result.count;
  }

  async blacklistAllUserTokens(userId: string): Promise<number> {
    const result = await prisma.token.updateMany({
      where: {
        userId,
        blacklisted: false,
        expires: { gte: new Date() },
      },
      data: { blacklisted: true },
    });
    return result.count;
  }

  async findByToken(token: string): Promise<Token | null> {
    return await prisma.token.findFirst({
      where: { token },
    });
  }

  async blacklistToken(token: string): Promise<void> {
    await prisma.token.updateMany({
      where: { token },
      data: { blacklisted: true },
    });
  }
}

export default new TokenRepository();
