import { OrderRepositoryInterface } from "../../interfaces/order.repository.interface";
import { OrderServiceInterface } from "../../interfaces/order.service.interface";
import { ItemServiceInterface } from "../../../menus/items/interfaces/item.service.interface";
import { createMenuItemFixture } from "../../../menus/items/__tests__/helpers";

/**
 * Creates a mocked OrderRepository with all methods as jest.fn()
 */
export function createMockOrderRepository(): jest.Mocked<OrderRepositoryInterface> {
  return {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    updateStatus: jest.fn(),
    cancel: jest.fn(),
    updateTotal: jest.fn(),
  };
}

/**
 * Creates a mocked OrderService with all methods as jest.fn()
 */
export function createMockOrderService(): jest.Mocked<OrderServiceInterface> {
  return {
    findAllOrders: jest.fn(),
    findOrderById: jest.fn(),
    createOrder: jest.fn(),
    updateOrderStatus: jest.fn(),
    cancelOrder: jest.fn(),
    batchCreateOrders: jest.fn(),
  };
}

/**
 * Creates a mocked ItemService (dependency of OrderService)
 */
export function createMockItemService(): {
  findMenuItemById: jest.Mock;
  deductStockForOrder: jest.Mock;
  revertStockForOrder: jest.Mock;
} {
  return {
    findMenuItemById: jest.fn(),
    deductStockForOrder: jest.fn(),
    revertStockForOrder: jest.fn(),
  };
}

export const itemServiceScenarios = {
  /**
   * Configures mock with a valid available item
   */
  itemAvailable: (mock: ReturnType<typeof createMockItemService>) => {
    const item = createMenuItemFixture({
      isAvailable: true,
      stockQuantity: 50,
    });
    mock.findMenuItemById.mockResolvedValue(item as never);
    mock.deductStockForOrder.mockResolvedValue(undefined);
    mock.revertStockForOrder.mockResolvedValue(undefined);
  },

  /**
   * Configures mock to simulate item not found
   */
  itemNotFound: (mock: ReturnType<typeof createMockItemService>) => {
    mock.findMenuItemById.mockRejectedValue(new Error("Menu item not found"));
  },

  /**
   * Configures mock to simulate unavailable item
   */
  itemUnavailable: (mock: ReturnType<typeof createMockItemService>) => {
    const item = createMenuItemFixture({ isAvailable: false });
    mock.findMenuItemById.mockResolvedValue(item as never);
  },

  /**
   * Configures mock to simulate out of stock
   */
  itemOutOfStock: (mock: ReturnType<typeof createMockItemService>) => {
    const item = createMenuItemFixture({
      isAvailable: true,
      stockQuantity: 0,
      inventoryType: "TRACKED",
    });
    mock.findMenuItemById.mockResolvedValue(item as never);
  },

  /**
   * Configures mock to simulate insufficient stock
   */
  insufficientStock: (mock: ReturnType<typeof createMockItemService>) => {
    mock.deductStockForOrder.mockRejectedValue(
      new Error("Insufficient stock for order"),
    );
  },

  /**
   * Configures mock with an unlimited inventory item
   */
  unlimitedItem: (mock: ReturnType<typeof createMockItemService>) => {
    const item = createMenuItemFixture({
      inventoryType: "UNLIMITED",
      stockQuantity: null,
      isAvailable: true,
    });
    mock.findMenuItemById.mockResolvedValue(item as never);
    mock.deductStockForOrder.mockResolvedValue(undefined);
  },
};

export const orderRepositoryScenarios = {
  /**
   * Configures mock to simulate order not found
   */
  orderNotFound: (mock: jest.Mocked<OrderRepositoryInterface>) => {
    mock.findById.mockResolvedValue(null);
  },

  /**
   * Configures mock to simulate database error
   */
  databaseError: (mock: jest.Mocked<OrderRepositoryInterface>) => {
    const error = new Error("Database connection failed");
    mock.findById.mockRejectedValue(error);
    mock.findAll.mockRejectedValue(error);
    mock.create.mockRejectedValue(error);
    mock.updateStatus.mockRejectedValue(error);
    mock.cancel.mockRejectedValue(error);
  },
};
