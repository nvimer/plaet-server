import { PrismaClient } from "@prisma/client";
import { logger } from "../src/config/logger";

const prisma = new PrismaClient();

async function main() {
  logger.info("Limpiando tabla daily_menus...");
  const deleted = await prisma.dailyMenu.deleteMany({});
  logger.info(`Se eliminaron ${deleted.count} registros.`);
}

main()
  .catch((e) => {
    logger.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
