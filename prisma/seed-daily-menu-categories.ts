/**
 * Daily Menu Categories Seed
 * 
 * Creates default categories for the daily lunch menu system.
 * These categories organize menu items for the daily menu configuration.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DAILY_MENU_CATEGORIES = [
  {
    name: 'Sopas',
    description: 'Sopas del día para el almuerzo ejecutivo',
    order: 1,
  },
  {
    name: 'Principios',
    description: 'Acompañamientos principales (frijoles, lentejas, garbanzos, etc.)',
    order: 2,
  },
  {
    name: 'Proteínas',
    description: 'Carnes y proteínas para el almuerzo (pollo, cerdo, res, pescado)',
    order: 3,
  },
  {
    name: 'Arroz',
    description: 'Arroz y carbohidratos base',
    order: 4,
  },
  {
    name: 'Ensaladas',
    description: 'Ensaladas y vegetales',
    order: 5,
  },
  {
    name: 'Jugos',
    description: 'Bebidas y jugos del día',
    order: 6,
  },
  {
    name: 'Extras',
    description: 'Acompañamientos adicionales (plátano, papa, etc.)',
    order: 7,
  },
  {
    name: 'Postres',
    description: 'Postres del día (actualmente inactivo)',
    order: 8,
  },
];

async function seedDailyMenuCategories() {
  console.log('🌱 Seeding Daily Menu Categories...\n');

  for (const category of DAILY_MENU_CATEGORIES) {
    try {
      const existing = await prisma.menuCategory.findUnique({
        where: { name: category.name },
      });

      if (existing) {
        console.log(`⏩ Category "${category.name}" already exists`);
        continue;
      }

      await prisma.menuCategory.create({
        data: category,
      });

      console.log(`✅ Created category: ${category.name}`);
    } catch (error) {
      console.error(`❌ Error creating category "${category.name}":`, error);
    }
  }

  console.log('\n🎉 Daily Menu Categories seed completed!');
}

async function main() {
  try {
    await seedDailyMenuCategories();
  } catch (error) {
    console.error('Failed to seed daily menu categories:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
