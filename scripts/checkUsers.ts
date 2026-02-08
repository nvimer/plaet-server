import prisma from "../src/database/prisma";

async function checkUsers() {
  const users = await prisma.user.findMany({
    where: { email: "admin@plaet.com" },
    orderBy: { createdAt: "desc" },
  });

  console.log("Users with email admin@plaet.com:", users.length);
  users.forEach((user) => {
    console.log(`- User ID: ${user.id}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  First Name: ${user.firstName}`);
    console.log(`  Created: ${user.createdAt}`);
    console.log(`  Deleted: ${user.deleted}`);
    console.log("---");
  });

  await prisma.$disconnect();
}

checkUsers().catch(console.error);
