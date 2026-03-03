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
            none: {}
          }
        },
      });

      if (ordersToCancel.length > 0) {
        console.log(`[Auto-Cancel Job] Found ${ordersToCancel.length} expired orders.`);
        
        for (const order of ordersToCancel) {
          await prisma.order.update({
            where: { id: order.id },
            data: { status: "CANCELLED" },
          });
          console.log(`[Auto-Cancel Job] Cancelled order ${order.id} due to inactivity.`);
        }
      }
    } catch (error) {
      console.error("[Auto-Cancel Job] Error:", error);
    }
  });

  console.log("[Auto-Cancel Job] Scheduled: Every 1 minute.");
};