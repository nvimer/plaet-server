import { ItemRepositoryInterface } from "../../interfaces/item.repository.interface";
import { ItemServiceInterface } from "../../interfaces/item.service.interface";
import { createMenuItemFixture } from "./item.fixtures";

export function createMockItemRepository(): jest.Mocked<ItemRepositoryInterface> {
  return {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByIdForUpdate: jest.fn(),
    create: jest.fn(),
    search: jest.fn(),
    findByCorrientazoFilters: jest.fn(),
    updateStock: jest.fn(),
    updateStockWithData: jest.fn(),
    createStockAdjustment: jest.fn(),
    dailyStockReset: jest.fn(),
    getLowStock: jest.fn(),
    getOutOfStock: jest.fn(),
    getStockHistory: jest.fn(),
    setInventoryType: jest.fn(),
  };
}

/**
 * Creates a mocked ItemService with all methods as jest.fn()
 */
export function createMockItemService(): jest.Mocked<ItemServiceInterface> {
  return {
    findAllMenuItems: jest.fn(),
    findMenuItemById: jest.fn(),
    createItem: jest.fn(),
    searchMenuItems: jest.fn(),
    getCorrientazoItems: jest.fn(),
    addStock: jest.fn(),
    removeStock: jest.fn(),
    deductStockForOrder: jest.fn(),
    revertStockForOrder: jest.fn(),
    dailyStockReset: jest.fn(),
    getLowStock: jest.fn(),
    getOutStock: jest.fn(),
    getStockHistory: jest.fn(),
    setInventoryType: jest.fn(),
  };
}

/**
 * Pre-configured mock scenarios for common test cases
 */
export const itemMockScenarios = {
  /**
   * Configures mock with a valid available item
   */
  itemAvailable: (mockRepo: jest.Mocked<ItemRepositoryInterface>) => {
    const item = createMenuItemFixture({
      isAvailable: true,
      stockQuantity: 50,
    });
    mockRepo.findById.mockResolvedValue(item);
  },

  /**
   * Configures mock to simulate item not found
   */
  itemNotFound: (mockRepo: jest.Mocked<ItemRepositoryInterface>) => {
    mockRepo.findById.mockResolvedValue(null);
  },

  /**
   * Configures mock to simulate unavailable item
   */
  itemUnavailable: (mockRepo: jest.Mocked<ItemRepositoryInterface>) => {
    const item = createMenuItemFixture({ isAvailable: false });
    mockRepo.findById.mockResolvedValue(item);
  },

  /**
   * Configures mock to simulate out of stock
   */
  itemOutOfStock: (mockRepo: jest.Mocked<ItemRepositoryInterface>) => {
    const item = createMenuItemFixture({
      isAvailable: false,
      stockQuantity: 0,
    });
    mockRepo.findById.mockResolvedValue(item);
  },

  /**
   * Configures mock to simulate database error
   */
  databaseError: (mockRepo: jest.Mocked<ItemRepositoryInterface>) => {
    const error = new Error("Database connection failed");
    mockRepo.findById.mockRejectedValue(error);
    mockRepo.findAll.mockRejectedValue(error);
    mockRepo.create.mockRejectedValue(error);
  },
};
