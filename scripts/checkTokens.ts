import prisma from "../src/database/prisma";

async function checkTokens() {
  // Get recent tokens
  const tokens = await prisma.token.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  console.log("Recent tokens:");
  tokens.forEach((token) => {
    console.log(`- Token: ${token.token.substring(0, 20)}...`);
    console.log(`  Type: ${token.type}`);
    console.log(`  Blacklisted: ${token.blacklisted}`);
    console.log(`  User ID: ${token.userId}`);
    console.log(`  Expires: ${token.expires}`);
    console.log(`  Created: ${token.createdAt}`);
    console.log("---");
  });

  await prisma.$disconnect();
}

checkTokens().catch(console.error);
