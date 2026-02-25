import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Limpiando tabla daily_menus...");
  const deleted = await prisma.dailyMenu.deleteMany({});
  console.log(`Se eliminaron ${deleted.count} registros.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
