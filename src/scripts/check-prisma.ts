import { getPrismaClient } from "../database/prisma";

async function check() {
  console.log("Checking Prisma Client...");
  try {
    const client = getPrismaClient();
    console.log("Client obtained.");

    if (!client) {
      console.error("Client is undefined!");
      return;
    }

    // Check if client has order property (even if inherited/getter)
    console.log("client.order type:", typeof client.order);

    if (client.order) {
      console.log("client.order exists.");
      try {
        const count = await client.order.count();
        console.log("Order count:", count);
      } catch (e) {
        console.error("Order count failed:", e);
      }
    } else {
      console.error("client.order is MISSING!");
    }
  } catch (error) {
    console.error("Error checking prisma:", error);
  }
}

check();
