/**
 * Seed sample items for daily menu categories
 * Creates sample menu items in each category for testing
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedSampleItems() {
  console.log('🌱 Seeding Sample Menu Items...\n');

  // Get categories
  const categories = await prisma.menuCategory.findMany();
  const categoryMap = new Map(categories.map(c => [c.name, c.id]));

  const sampleItems = [
    // Sopas
    { name: 'Sopa de Verduras', category: 'Sopas', price: 0, description: 'Sopa del día con vegetales frescos' },
    { name: 'Sopa de Pasta', category: 'Sopas', price: 0, description: 'Sopa con fideos y pollo' },
    
    // Principios
    { name: 'Frijoles', category: 'Principios', price: 0, description: 'Frijoles rojos o negros' },
    { name: 'Lentejas', category: 'Principios', price: 0, description: 'Lentejas con verduras' },
    { name: 'Garbanzos', category: 'Principios', price: 0, description: 'Garbanzos guisados' },
    
    // Proteínas
    { name: 'Chuleta de Cerdo', category: 'Proteínas', price: 6000, description: 'Chuleta de cerdo a la plancha' },
    { name: 'Pechuga de Pollo', category: 'Proteínas', price: 6000, description: 'Pechuga de pollo a la plancha' },
    { name: 'Carne de Res', category: 'Proteínas', price: 7000, description: 'Carne de res asada' },
    { name: 'Filete de Pescado', category: 'Proteínas', price: 8000, description: 'Filete de pescado frito' },
    
    // Arroz
    { name: 'Arroz Blanco', category: 'Arroz', price: 0, description: 'Arroz blanco cocido' },
    { name: 'Arroz Integral', category: 'Arroz', price: 0, description: 'Arroz integral cocido' },
    
    // Ensaladas
    { name: 'Ensalada Mixta', category: 'Ensaladas', price: 0, description: 'Lechuga, tomate y cebolla' },
    
    // Jugos
    { name: 'Jugo de Mango', category: 'Jugos', price: 0, description: 'Jugo natural de mango' },
    { name: 'Jugo de Maracuyá', category: 'Jugos', price: 0, description: 'Jugo natural de maracuyá' },
    
    // Extras
    { name: 'Plátano Maduro', category: 'Extras', price: 3000, description: 'Plátano maduro frito' },
    { name: 'Papas Fritas', category: 'Extras', price: 4000, description: 'Porción de papas fritas' },
    { name: 'Yuca Frita', category: 'Extras', price: 3500, description: 'Yuca frita crocante' },
    
    // Postres (inactivos por ahora)
    { name: 'Gelatina', category: 'Postres', price: 2000, description: 'Gelatina de frutas', isAvailable: false },
  ];

  for (const item of sampleItems) {
    const categoryId = categoryMap.get(item.category);
    if (!categoryId) {
      console.log(`⏩ Skipping ${item.name} - category not found`);
      continue;
    }

    const existing = await prisma.menuItem.findFirst({
      where: { name: item.name, categoryId },
    });

    if (existing) {
      console.log(`⏩ Item "${item.name}" already exists`);
      continue;
    }

    await prisma.menuItem.create({
      data: {
        name: item.name,
        description: item.description,
        price: item.price,
        categoryId,
        isAvailable: item.isAvailable ?? true,
        inventoryType: 'UNLIMITED',
      },
    });

    console.log(`✅ Created item: ${item.name} (${item.category})`);
  }

  console.log('\n🎉 Sample items seed completed!');
}

async function main() {
  try {
    await seedSampleItems();
  } catch (error) {
    console.error('Failed to seed sample items:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
