import { PrismaClient } from "@prisma/client";
import cron from "node-cron";

const prisma = new PrismaClient();

/**
 * Order Auto-Cancel Job
 * 
 * Runs every minute to find OPEN orders that are older than 10 minutes
 * and marks them as CANCELLED.
 */
export const startOrderAutoCancelJob = () => {
  cron.schedule("* * * * *", async () => {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    try {
      const ordersToCancel = await prisma.order.findMany({
        where: {
          status: "OPEN",
          createdAt: {
            lt: tenMinutesAgo,
          },
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