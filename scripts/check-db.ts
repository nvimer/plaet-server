import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface MenuItem {
  id: number;
  name: string;
  categoryId: number;
}

async function check(): Promise<void> {
  try {
    const count = await prisma.menuItem.count();
    // eslint-disable-next-line no-console
    console.log("Total menu items:", count);

    const items = await prisma.menuItem.findMany({ take: 5 });
    // eslint-disable-next-line no-console
    console.log(
      "Sample items:",
      items.map((i: MenuItem) => ({
        id: i.id,
        name: i.name,
        categoryId: i.categoryId,
      })),
    );
    // eslint-disable-next-line no-console
    console.log("\n✅ Database connection successful!");
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    // eslint-disable-next-line no-console
    console.error("❌ Error:", errorMessage);
  } finally {
    await prisma.$disconnect();
  }
}

check();
