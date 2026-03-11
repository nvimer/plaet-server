import {
  Order,
  MenuItem,
  OrderItemStatus,
} from "@prisma/client";
import { CustomError } from "../../../types/custom-errors";
import {
  InventoryType,
  OrderStatus,
  OrderWithItems,
} from "../../../types/prisma.types";
import { HttpStatus } from "../../../utils/httpStatus.enum";
import { ItemServiceInterface } from "../../menus/items/interfaces/item.service.interface";
import { OrderRepositoryInterface } from "../interfaces/order.repository.interface";
import {
  CreateOrderBodyInput,
  BatchCreateOrderBodyInput,
  OrderItemInput,
} from "../order.validator";
import dailyMenuRepository from "../../daily-menu/daily-menu.repository";
import { DailyMenuWithRelations } from "../../daily-menu/interfaces/daily-menu.repository.interface";
import { CashClosureRepository } from "../../cash-closures/cash-closure.repository";
import { getPrismaClient } from "../../../database/prisma";
import { PrismaTransaction } from "../../../types/prisma-transaction.types";
import { dateUtils } from "../../../utils/date.utils";

type OrderCustomerData = {
  id?: string;
  name?: string;
  phone?: string;
  phone2?: string;
  address1?: string;
  address2?: string;
  restaurantId?: string;
};

type OrderCreateData = CreateOrderBodyInput & OrderCustomerData;

export class OrderCreationService {
  private cashClosureRepo = new CashClosureRepository();

  constructor(
    private orderRepository: OrderRepositoryInterface,
    private itemService: Pick<
      ItemServiceInterface,
      "findMenuItemById" | "deductStockForOrder"
    >,
  ) {}

  /**
   * Private Helper: Determine initial status for an item
   */
  public determineItemStatus(
    menuItemId: number | null,
    dailyMenu: DailyMenuWithRelations | null,
    isMainItem: boolean,
  ): OrderItemStatus {
    if (!menuItemId) return OrderItemStatus.READY;

    if (isMainItem) return OrderItemStatus.PENDING;

    if (
      dailyMenu &&
      (menuItemId === dailyMenu.soupOption1Id ||
        menuItemId === dailyMenu.soupOption2Id)
    ) {
      return OrderItemStatus.PENDING;
    }

    return OrderItemStatus.READY;
  }

  /**
   * Calculates order total using combo pricing for setLunch orders
   */
  public calculateOrderTotal(
    items: OrderItemInput[],
    menuItems: MenuItem[],
    dailyMenu: DailyMenuWithRelations | null,
  ): number {
    const basePrice = dailyMenu ? (Number(dailyMenu.basePrice) || 3000) : 0;
    const proteinCategoryId = dailyMenu?.proteinCategoryId;

    const proteinItems = items
      .map((item) => {
        const menuItem = menuItems.find((mi) => mi.id === item.menuItemId);
        return { ...item, menuItem, price: Number(menuItem?.price || 0) };
      })
      .filter(
        (item) =>
          proteinCategoryId && item.menuItem && item.menuItem.categoryId === proteinCategoryId,
      )
      .sort((a, b) => b.price - a.price);

    const mainProtein = proteinItems[0];

    if (mainProtein) {
      let total = mainProtein.price + basePrice;

      const everythingElse = items.map((item) => {
        const menuItem = menuItems.find((mi) => mi.id === item.menuItemId);
        return {
          ...item,
          price: Number(menuItem?.price || item.priceAtOrder || 0),
        };
      });

      const mainProteinOriginalIndex = items.findIndex(
        (i) => i.menuItemId === mainProtein.menuItemId,
      );

      everythingElse.forEach((item, index) => {
        if (index !== mainProteinOriginalIndex) {
          total += item.price * item.quantity;
        }
      });

      return total;
    } else {
      return items.reduce((sum, item) => {
        const menuItem = menuItems.find((mi) => mi.id === item.menuItemId);
        const price = Number(menuItem?.price || item.priceAtOrder || 0);
        return sum + price * item.quantity;
      }, 0);
    }
  }

  /**
   * Handle customer info (Find or Create)
   */
  public async getOrCreateCustomer(
    restaurantId: string | null | undefined,
    data: {
      id?: string;
      name?: string;
      phone?: string;
      phone2?: string;
      address1?: string;
      address2?: string;
    },
    tx: PrismaTransaction,
  ): Promise<string | null> {
    if (data.id) return data.id;
    if (!data.phone || !restaurantId) return null;

    const existing = await tx.customer.findFirst({
      where: {
        restaurantId,
        OR: [{ phone: data.phone }, { phone2: data.phone }],
      },
    });

    if (existing) {
      await tx.customer.update({
        where: { id: existing.id },
        data: {
          phone2: data.phone2 || existing.phone2,
          address1: data.address1 || existing.address1,
          address2: data.address2 || existing.address2,
        },
      });
      return existing.id;
    }

    const nameParts = (data.name || "Cliente").trim().split(" ");
    const firstName = nameParts[0];
    const lastName =
      nameParts.length > 1 ? nameParts.slice(1).join(" ") : "Sazonarte";

    const newCustomer = await tx.customer.create({
      data: {
        restaurantId,
        firstName,
        lastName,
        phone: data.phone,
        phone2: data.phone2,
        address1: data.address1,
        address2: data.address2,
      },
    });

    return newCustomer.id;
  }

  /**
   * Creates New Order
   */
  async createOrder(
    waiterId: string,
    restaurantId: string | null | undefined,
    data: CreateOrderBodyInput,
  ): Promise<OrderWithItems> {
    const client = getPrismaClient();

    const orderDate = data.createdAt
      ? dateUtils.startOfDay(data.createdAt)
      : dateUtils.now();
    const dailyMenu = await dailyMenuRepository.findByCreatedAt(orderDate);
    const basePrice = dailyMenu ? (Number(dailyMenu.basePrice) || 3000) : 0;

    const isHistorical = data.createdAt && dateUtils.startOfDay(data.createdAt).getTime() < dateUtils.today().getTime();
    let closureId: string | undefined;

    if (isHistorical) {
      const historicalClosure = await this.cashClosureRepo.findActiveOnDate(new Date(data.createdAt!), restaurantId || undefined);
      closureId = historicalClosure?.id;
    } else {
      const activeClosure = await this.cashClosureRepo.findCurrentOpen(restaurantId || undefined);
      if (!activeClosure) {
        throw new CustomError(
          "No hay un turno de caja abierto. Por favor abre caja antes de crear pedidos.",
          HttpStatus.BAD_REQUEST,
          "CASH_CLOSURE_REQUIRED",
        );
      }
      closureId = activeClosure.id;
    }

    const menuItemsPromises = data.items.map((item) =>
      item.menuItemId
        ? this.itemService.findMenuItemById(item.menuItemId)
        : Promise.resolve(null),
    );
    const menuItems = await Promise.all(menuItemsPromises);

    const unavailableItems = menuItems.filter(
      (item) => item && !item.isAvailable,
    );
    if (unavailableItems.length > 0) {
      const itemNames = unavailableItems.map((item) => item?.name).join(", ");
      throw new CustomError(
        `The following items are not available: ${itemNames}`,
        HttpStatus.BAD_REQUEST,
        "ITEMS_NOT_AVAILABLE",
      );
    }

    for (let i = 0; i < data.items.length; i++) {
      const orderItem = data.items[i];
      const menuItem = menuItems[i];
      if (menuItem && menuItem.inventoryType === InventoryType.TRACKED) {
        const availableStock = menuItem?.stockQuantity ?? 0;
        if (availableStock < orderItem.quantity) {
          throw new CustomError(
            `Insufficient stock for ${menuItem?.name}`,
            HttpStatus.BAD_REQUEST,
            "INSUFFICIENT_STOCK",
          );
        }
      }
    }

    let existingOrder: Order | null = null;
    if (data.type === "DINE_IN" && data.tableId && restaurantId) {
      existingOrder = await client.order.findFirst({
        where: {
          tableId: data.tableId,
          restaurantId: restaurantId,
          status: OrderStatus.OPEN,
        },
      });
    }

    return await client.$transaction(async (tx: PrismaTransaction) => {
      let orderId: string;
      let currentTotal = 0;

      if (existingOrder) {
        orderId = existingOrder.id;
        currentTotal = Number(existingOrder.totalAmount);

        const proteinCategoryId = dailyMenu?.proteinCategoryId;

        const proteinItems = data.items
          .map((item, index) => ({
            index,
            price: Number(menuItems[index]?.price || 0),
            categoryId: menuItems[index]?.categoryId,
          }))
          .filter((item) => proteinCategoryId && item.categoryId === proteinCategoryId)
          .sort((a, b) => b.price - a.price);

        const mainProteinIndex = proteinItems[0]?.index;

        await tx.orderItem.createMany({
          data: data.items.map((item, index) => {
            const itemBasePrice = Number(
              menuItems[index]?.price || item.priceAtOrder || 0,
            );
            const isMainProtein = index === mainProteinIndex;
            return {
              orderId,
              menuItemId: item.menuItemId!,
              quantity: item.quantity,
              priceAtOrder: itemBasePrice + (isMainProtein ? basePrice : 0),
              notes: item.notes,
              status: this.determineItemStatus(
                item.menuItemId!,
                dailyMenu,
                isMainProtein,
              ),
            };
          }),
        });

        await tx.table.update({
          where: { id: data.tableId! },
          data: { status: "OCCUPIED" },
        });
      } else {
        const customerId = await this.getOrCreateCustomer(
          restaurantId,
          {
            id: data.customerId,
            name: data.customerName,
            phone: data.customerPhone,
            phone2: data.customerPhone2,
            address1: data.address1,
            address2: data.address2,
          },
          tx,
        );

        const {
          customerName: _cn,
          customerPhone: _cp,
          customerPhone2: _cp2,
          address1: _a1,
          address2: _a2,
          ...cleanData
        } = data as OrderCreateData;

        const proteinCategoryId = dailyMenu?.proteinCategoryId;

        const proteinItems = data.items
          .map((item, index) => ({
            item,
            price: Number(menuItems[index]?.price || item.priceAtOrder || 0),
            categoryId: menuItems[index]?.categoryId,
          }))
          .filter((item) => proteinCategoryId && item.categoryId === proteinCategoryId)
          .sort((a, b) => b.price - a.price);

        const mainProtein = proteinItems[0]?.item;

        const itemsWithBasePrice = data.items.map((item) => {
          const mi = menuItems.find((m) => m?.id === item.menuItemId);
          const baseItemPrice = mi
            ? Number(mi.price)
            : Number(item.priceAtOrder || 0);
          const isMainProtein = item === mainProtein;
          return {
            ...item,
            priceAtOrder: baseItemPrice + (isMainProtein ? basePrice : 0),
            status: this.determineItemStatus(
              item.menuItemId || null,
              dailyMenu,
              isMainProtein,
            ),
          };
        });

        const order = await this.orderRepository.create(
          waiterId,
          {
            ...cleanData,
            status: data.status || OrderStatus.OPEN,
            items: itemsWithBasePrice.map(item => ({
              ...item,
              status: data.itemStatus || item.status
            })),
            customerId: customerId ?? undefined,
            cashClosureId: closureId,
          },
          tx,
        );
        orderId = order.id;

        // If order is created as PAID (Fast Historical Entry), create a matching payment record
        if (data.status === OrderStatus.PAID) {
          const totalAmount = itemsWithBasePrice.reduce((sum, item) => sum + (item.priceAtOrder || 0) * item.quantity, 0);
          await tx.payment.create({
            data: {
              orderId,
              amount: totalAmount,
              method: "CASH",
              cashClosureId: closureId || null,
              createdAt: orderDate,
            }
          });
        }

        if (data.type === "DINE_IN" && data.tableId) {
          await tx.table.update({
            where: { id: data.tableId },
            data: { status: "OCCUPIED" },
          });
        }
      }

      const newItemsTotal = this.calculateOrderTotal(
        data.items,
        menuItems.filter((mi): mi is MenuItem => mi !== null),
        dailyMenu,
      );

      await this.orderRepository.updateTotal(
        orderId,
        currentTotal + newItemsTotal,
        tx,
      );

      const stockDeductionPromises = data.items.map((item, index) => {
        const menuItem = menuItems[index];
        if (menuItem && menuItem.inventoryType === InventoryType.TRACKED) {
          return this.itemService.deductStockForOrder(
            item.menuItemId!,
            item.quantity,
            orderId,
            tx,
          );
        }
        return Promise.resolve();
      });
      await Promise.all(stockDeductionPromises);

      const updatedOrder = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: {
              menuItem: true,
            },
          },
        },
      });

      if (!updatedOrder) {
        throw new CustomError(
          `Order with ID ${orderId} not found after creation/update`,
          HttpStatus.INTERNAL_SERVER_ERROR,
          "ORDER_NOT_FOUND",
        );
      }

      return updatedOrder as OrderWithItems;
    });
  }

  /**
   * Batch Create Orders
   */
  async batchCreateOrders(
    waiterId: string,
    restaurantId: string | null | undefined,
    data: BatchCreateOrderBodyInput,
  ): Promise<{ orders: OrderWithItems[]; tableTotal: number }> {
    const client = getPrismaClient();

    const firstSubOrder = data.orders[0];
    const orderDate = firstSubOrder.createdAt
      ? dateUtils.startOfDay(firstSubOrder.createdAt)
      : dateUtils.today();
    const dailyMenu = await dailyMenuRepository.findByCreatedAt(orderDate);
    const basePrice = dailyMenu ? (Number(dailyMenu.basePrice) || 3000) : 0;

    const isHistorical = firstSubOrder.createdAt && dateUtils.startOfDay(firstSubOrder.createdAt).getTime() < dateUtils.today().getTime();
    let closureId: string | undefined;

    if (isHistorical) {
      const historicalClosure = await this.cashClosureRepo.findActiveOnDate(new Date(firstSubOrder.createdAt!), restaurantId || undefined);
      closureId = historicalClosure?.id;
    } else {
      const activeClosure = await this.cashClosureRepo.findCurrentOpen(restaurantId || undefined);
      if (!activeClosure) {
        throw new CustomError(
          "No hay un turno de caja abierto. Por favor abre caja antes de crear pedidos.",
          HttpStatus.BAD_REQUEST,
          "CASH_CLOSURE_REQUIRED",
        );
      }
      closureId = activeClosure.id;
    }

    const existingOrder = data.tableId
      ? await client.order.findFirst({
          where: {
            tableId: data.tableId,
            status: OrderStatus.OPEN,
          },
        })
      : null;

    return await client.$transaction(async (tx: PrismaTransaction) => {
      let masterOrderId: string;
      let tableTotal = existingOrder ? Number(existingOrder.totalAmount) : 0;

      if (existingOrder) {
        masterOrderId = existingOrder.id;
      } else {
        const firstSubOrder = data.orders[0];
        const restaurantId = (
          await tx.user.findUnique({
            where: { id: waiterId },
            select: { restaurantId: true },
          })
        )?.restaurantId;

        const customerId = await this.getOrCreateCustomer(
          restaurantId,
          {
            id: firstSubOrder.customerId,
            name: firstSubOrder.customerName,
            phone: firstSubOrder.customerPhone,
            phone2: firstSubOrder.customerPhone2,
            address1: firstSubOrder.address1,
            address2: firstSubOrder.address2,
          },
          tx,
        );

        const newOrder = await this.orderRepository.create(
          waiterId,
          {
            tableId: data.tableId,
            type: firstSubOrder.type,
            customerId: customerId || undefined,
            items: [],
            notes: "Group Order",
            createdAt: firstSubOrder.createdAt || dateUtils.now(),
            cashClosureId: closureId,
            status: firstSubOrder.status || OrderStatus.OPEN,
          } as CreateOrderBodyInput,
          tx,
        );
        masterOrderId = newOrder.id;
      }

      const allMenuItemIds = new Set<number>();
      data.orders.forEach((o) =>
        o.items.forEach((i) => {
          if (i.menuItemId) allMenuItemIds.add(i.menuItemId);
        }),
      );

      const menuItems = await tx.menuItem.findMany({
        where: { id: { in: Array.from(allMenuItemIds) }, deleted: false },
      });

      for (const subOrder of data.orders) {
        const orderMenuItems = subOrder.items
          .map((item) =>
            item.menuItemId
              ? menuItems.find((mi) => mi.id === item.menuItemId)
              : null,
          )
          .filter((mi): mi is NonNullable<typeof mi> => mi !== null);

        const serviceAmount = this.calculateOrderTotal(
          subOrder.items.filter(
            (i): i is OrderItemInput & { menuItemId: number } => !!i.menuItemId,
          ),
          orderMenuItems,
          dailyMenu,
        );

        const manualItemsAmount = subOrder.items
          .filter((i) => !i.menuItemId)
          .reduce(
            (sum, i) => sum + Number(i.priceAtOrder || 0) * i.quantity,
            0,
          );

        const subOrderTotal = serviceAmount + manualItemsAmount;
        tableTotal += subOrderTotal;

        // If subOrder is marked as PAID, create a corresponding payment
        if (subOrder.status === OrderStatus.PAID) {
          await tx.payment.create({
            data: {
              orderId: masterOrderId,
              amount: subOrderTotal,
              method: "CASH",
              cashClosureId: closureId || null,
              createdAt: subOrder.createdAt || dateUtils.now(),
            }
          });
        }

        const proteinCategoryId = dailyMenu?.proteinCategoryId;

        const subProteinsWithPrices = subOrder.items
          .map((item, idx) => {
            const mi = item.menuItemId
              ? menuItems.find((m) => m.id === item.menuItemId)
              : null;
            return {
              idx,
              price: Number(mi?.price || item.priceAtOrder || 0),
              categoryId: mi?.categoryId,
            };
          })
          .filter((p) => proteinCategoryId && p.categoryId === proteinCategoryId)
          .sort((a, b) => b.price - a.price);

        const mainProteinIdx = subProteinsWithPrices[0]?.idx;

        await tx.orderItem.createMany({
          data: subOrder.items.map((item, index) => {
            const mi = item.menuItemId
              ? menuItems.find((m) => m.id === item.menuItemId)
              : null;
            const itemPrice = mi
              ? Number(mi.price)
              : Number(item.priceAtOrder || 0);
            const isMainProtein = index === mainProteinIdx;

            return {
              orderId: masterOrderId,
              menuItemId: item.menuItemId ?? null,
              quantity: item.quantity,
              priceAtOrder: itemPrice + (isMainProtein ? basePrice : 0),
              notes: item.notes ?? null,
              status: subOrder.itemStatus || this.determineItemStatus(
                item.menuItemId ?? null,
                dailyMenu,
                isMainProtein,
              ),
              createdAt: subOrder.createdAt ?? dateUtils.now(),
            };
          }),
        });

        for (const item of subOrder.items) {
          const mi = item.menuItemId
            ? menuItems.find((m) => m.id === item.menuItemId)
            : null;
          if (mi && mi.inventoryType === InventoryType.TRACKED) {
            await this.itemService.deductStockForOrder(
              item.menuItemId!,
              item.quantity,
              masterOrderId,
              tx,
            );
          }
        }
      }

      await this.orderRepository.updateTotal(masterOrderId, tableTotal, tx);

      if (data.tableId) {
        await tx.table.update({
          where: { id: data.tableId },
          data: { status: "OCCUPIED" },
        });
      }

      const completeOrder = await tx.order.findUnique({
        where: { id: masterOrderId },
        include: { items: { include: { menuItem: true } } },
      });

      return { orders: [completeOrder as OrderWithItems], tableTotal };
    });
  }
}
