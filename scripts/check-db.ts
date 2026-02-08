const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const count = await prisma.menuItem.count();
    console.log('Total menu items:', count);
    
    const items = await prisma.menuItem.findMany({ take: 5 });
    console.log('Sample items:', items.map((i: any) => ({ id: i.id, name: i.name, categoryId: i.categoryId })));
    console.log('\n✅ Database connection successful!');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

check();
