import { logger } from "../config/logger";
import { PrismaClient } from "@prisma/client";
import cron from "node-cron";

const prisma = new PrismaClient();

/**
 * Order Auto-Cancel Job
 *
 * Runs every minute to find OPEN orders that are older than 10 minutes
 * and marks them as CANCELLED.
 *
 * Safety features:
 * 1. Only targets orders created VERY RECENTLY (last 60 mins) to protect old historical data.
 * 2. Only targets orders with NO PAYMENTS.
 * 3. Only targets orders not updated in the last 10 minutes.
 */
export const startOrderAutoCancelJob = () => {
  cron.schedule("* * * * *", async () => {
    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    try {
      const ordersToCancel = await prisma.order.findMany({
        where: {
          status: "OPEN",
          // Protect historical entries: only touch things created in the last hour
          createdAt: {
            gt: oneHourAgo,
            lt: tenMinutesAgo,
          },
          // Protect active orders: only touch things not modified in 10 mins
          updatedAt: {
            lt: tenMinutesAgo,
          },
          // CRITICAL: Only cancel if NO payments have been registered
          payments: {
            none: {},
          },
        },
      });

      if (ordersToCancel.length > 0) {
        logger.info(
          `[Auto-Cancel Job] Found ${ordersToCancel.length} expired orders.`,
        );

        for (const order of ordersToCancel) {
          await prisma.$transaction(async (tx) => {
            // 1. Mark order as CANCELLED
            await tx.order.update({
              where: { id: order.id },
              data: { status: "CANCELLED" },
            });

            // 2. If it has a table, mark it as AVAILABLE
            if (order.tableId) {
              await tx.table.update({
                where: { id: order.tableId },
                data: { status: "AVAILABLE" },
              });
            }
          });
          logger.info(
            `[Auto-Cancel Job] Cancelled order ${order.id} and released table ${order.tableId || "N/A"} due to inactivity.`,
          );
        }
      }
    } catch (error) {
      logger.error("[Auto-Cancel Job] Error:", error);
    }
  });
};
