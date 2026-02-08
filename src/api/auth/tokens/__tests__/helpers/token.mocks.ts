import { TokenRepositoryInterface } from "../../token.interface";
import { createTokenFixture } from "./token.fixtures";

export function createMockTokenRepository(): jest.Mocked<TokenRepositoryInterface> {
  return {
    saveToken: jest.fn(),
    deleteRefreshTokenByUserId: jest.fn(),
    blacklistAllUserTokens: jest.fn(),
    findByToken: jest.fn(),
  };
}

export const tokenMockScenarios = {
  /**
   * Configures mock to successfully save a token
   */
  saveSuccess: (mockRepo: jest.Mocked<TokenRepositoryInterface>) => {
    const token = createTokenFixture();
    mockRepo.saveToken.mockResolvedValue(token);
  },

  /**
   * Configures mock to successfully delete refresh tokens
   */
  deleteSuccess: (mockRepo: jest.Mocked<TokenRepositoryInterface>) => {
    mockRepo.deleteRefreshTokenByUserId.mockResolvedValue(1);
  },

  /**
   * Configures mock to simulate no tokens to delete
   */
  noTokensToDelete: (mockRepo: jest.Mocked<TokenRepositoryInterface>) => {
    mockRepo.deleteRefreshTokenByUserId.mockResolvedValue(0);
  },

  /**
   * Configures mock to simulate database error
   */
  databaseError: (mockRepo: jest.Mocked<TokenRepositoryInterface>) => {
    const error = new Error("Database connection failed");
    mockRepo.saveToken.mockRejectedValue(error);
    mockRepo.deleteRefreshTokenByUserId.mockRejectedValue(error);
  },
};
