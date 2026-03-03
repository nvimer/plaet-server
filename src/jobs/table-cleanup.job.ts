import cron from "node-cron";
import { getPrismaClient } from "../database/prisma";
import { logger } from "../config/logger";
import { TableStatus, OrderStatus, Order } from "@prisma/client";

const prisma = getPrismaClient();

export const startTableCleanupJob = () => {
  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();
      const twentyMinutesAgo = new Date(now.getTime() - 20 * 60 * 1000);
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const occupiedTables = await prisma.table.findMany({
        where: { status: TableStatus.OCCUPIED },
        include: {
          orders: {
            where: { createdAt: { gte: startOfDay } },
            orderBy: { updatedAt: "desc" },
          },
        },
      });

      for (const table of occupiedTables) {
        const ongoingOrders = table.orders.filter(
          (o: Order) =>
            o.status !== OrderStatus.PAID && o.status !== OrderStatus.CANCELLED,
        );

        if (ongoingOrders.length > 0) continue;

        const deliveredOrders = table.orders.filter(
          (o: Order) => o.status === OrderStatus.PAID,
        );

        if (deliveredOrders.length > 0) {
          const latestDelivery = deliveredOrders[0].updatedAt;

          if (latestDelivery < twentyMinutesAgo) {
            await prisma.table.update({
              where: { id: table.id },
              data: { status: TableStatus.NEEDS_CLEANING },
            });
            logger.info(
              `🧹 CronJob: Mesa ${table.number} ha pasado a Limpieza tras 20 min de inactividad.`,
            );
          }
        }
      }
    } catch (error) {
      logger.error("Error running table cleanup job:", error);
    }
  });
  logger.info("🕒 Table cleanup cron job started (Runs every minute).");
};
