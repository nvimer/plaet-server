import { PrismaClient, Token, TokenType } from "@prisma/client";

export class TestTokenRepository {
  constructor(private prisma: any) {}

  async create(data: {
    token: string;
    type: TokenType;
    expires: Date;
    userId: string;
    blacklisted?: boolean;
  }): Promise<Token> {
    return await this.prisma.token.create({
      data: {
        token: data.token,
        type: data.type,
        expires: data.expires,
        userId: data.userId,
        blacklisted: data.blacklisted || false,
      },
    });
  }

  async findByToken(token: string): Promise<Token | null> {
    return await this.prisma.token.findFirst({
      where: { token },
    });
  }

  async findByUserId(userId: string): Promise<Token[]> {
    return await this.prisma.token.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async findByType(type: TokenType): Promise<Token[]> {
    return await this.prisma.token.findMany({
      where: { type },
      orderBy: { createdAt: "desc" },
    });
  }

  async findById(id: string): Promise<Token | null> {
    return await this.prisma.token.findUnique({
      where: { id },
    });
  }

  async update(id: string, data: Partial<Token>): Promise<Token> {
    return await this.prisma.token.update({
      where: { id },
      data,
    });
  }

  async blacklist(id: string): Promise<Token> {
    return await this.prisma.token.update({
      where: { id },
      data: { blacklisted: true },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.token.delete({
      where: { id },
    });
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.prisma.token.deleteMany({
      where: { userId },
    });
  }

  async deleteExpired(): Promise<number> {
    const result = await this.prisma.token.deleteMany({
      where: {
        expires: {
          lt: new Date(),
        },
      },
    });
    return result.count;
  }

  async isValid(token: string): Promise<boolean> {
    const tokenRecord = await this.findByToken(token);

    if (!tokenRecord) {
      return false;
    }

    if (tokenRecord.blacklisted) {
      return false;
    }

    if (tokenRecord.expires < new Date()) {
      return false;
    }

    return true;
  }

  async createTestTokens(userId: string, count: number = 3): Promise<Token[]> {
    const tokens: Token[] = [];

    for (let i = 0; i < count; i++) {
      const tokenData = {
        token:
          Math.random().toString(36).substring(2, 15) +
          Math.random().toString(36).substring(2, 15),
        type: TokenType.ACCESS,
        expires: new Date(Date.now() + (i + 1) * 60 * 60 * 1000), // 1h, 2h, 3h from now
        userId,
        blacklisted: false,
      };

      const token = await this.create(tokenData);
      tokens.push(token);
    }

    return tokens;
  }

  async createExpiredToken(userId: string): Promise<Token> {
    return await this.create({
      token:
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15),
      type: TokenType.ACCESS,
      expires: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      userId,
      blacklisted: false,
    });
  }

  async createBlacklistedToken(userId: string): Promise<Token> {
    return await this.create({
      token:
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15),
      type: TokenType.REFRESH,
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      userId,
      blacklisted: true,
    });
  }

  async deleteAll(): Promise<void> {
    await this.prisma.token.deleteMany();
  }

  async count(): Promise<number> {
    return await this.prisma.token.count();
  }

  async countByType(type: TokenType): Promise<number> {
    return await this.prisma.token.count({
      where: { type },
    });
  }

  async countByUserId(userId: string): Promise<number> {
    return await this.prisma.token.count({
      where: { userId },
    });
  }

  async countExpired(): Promise<number> {
    return await this.prisma.token.count({
      where: {
        expires: {
          lt: new Date(),
        },
      },
    });
  }

  async countBlacklisted(): Promise<number> {
    return await this.prisma.token.count({
      where: { blacklisted: true },
    });
  }
}
