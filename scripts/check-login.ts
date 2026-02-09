import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkLogin(): Promise<void> {
  try {
    const user = await prisma.user.findFirst();

    if (!user) {
      // eslint-disable-next-line no-console
      console.log("❌ No hay usuarios en la base de datos");
      return;
    }

    // eslint-disable-next-line no-console
    console.log("✅ Usuario encontrado:", {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    });

    if (!user.password) {
      // eslint-disable-next-line no-console
      console.log("❌ El usuario no tiene contraseña");
      return;
    }

    // eslint-disable-next-line no-console
    console.log("✅ El usuario tiene contraseña configurada");
    // eslint-disable-next-line no-console
    console.log("\n📧 Intenta iniciar sesión con:");
    // eslint-disable-next-line no-console
    console.log("   Email:", user.email);
    // eslint-disable-next-line no-console
    console.log("   Password: La que configuraste durante el seed");
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    // eslint-disable-next-line no-console
    console.error("❌ Error:", errorMessage);
  } finally {
    await prisma.$disconnect();
  }
}

checkLogin();
