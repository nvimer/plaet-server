import { PrismaClient } from "@prisma/client";
import { logger } from "../../src/config/logger";

const prisma = new PrismaClient();

const sazonarteItems = [
  // Sopas
  { categoryName: "Sopas", name: "Sopa de Avena", price: 0, description: "Sopa cremosa de avena" },
  { categoryName: "Sopas", name: "Sopa de Quinoa", price: 0, description: "Sopa nutritiva de quinoa con verduras" },
  { categoryName: "Sopas", name: "Sopa de Cebada", price: 0, description: "Sopa tradicional de cebada" },
  { categoryName: "Sopas", name: "Sopa de Cebada Perlada", price: 0, description: "Sopa de cebada perlada con carne" },
  { categoryName: "Sopas", name: "Sopa de Pasta", price: 0, description: "Sopa de menudencias con pasta" },
  { categoryName: "Sopas", name: "Sopa de Plátano", price: 0, description: "Sopa de plátano verde picado" },
  { categoryName: "Sopas", name: "Sancocho", price: 0, description: "Sancocho tradicional con trifásico opcional" },
  { categoryName: "Sopas", name: "Sopa de Choclo", price: 0, description: "Sopa de maíz tierno" },
  { categoryName: "Sopas", name: "Sopa de Maíz", price: 0, description: "Sopa de maíz blanco" },
  { categoryName: "Sopas", name: "Crema de Ahuyama", price: 0, description: "Crema suave de ahuyama" },
  { categoryName: "Sopas", name: "Sopa de Tortilla", price: 0, description: "Sopa con tiras de tortilla y aguacate" },

  // Arroces
  { categoryName: "Arroces", name: "Arroz Blanco", price: 0, description: "Arroz blanco tradicional" },
  { categoryName: "Arroces", name: "Arroz Integral", price: 0, description: "Arroz integral saludable" },
  { categoryName: "Arroces", name: "Arroz Verde", price: 0, description: "Arroz con espinaca y cilantro" },
  { categoryName: "Arroces", name: "Arroz con Coco", price: 0, description: "Arroz dulce con coco" },

  // Principios
  { categoryName: "Principios", name: "Frijol", price: 0, description: "Frijoles rojos guisados" },
  { categoryName: "Principios", name: "Arveja Seca", price: 0, description: "Arveja amarilla de paquete" },
  { categoryName: "Principios", name: "Garbanzo", price: 0, description: "Garbanzos con chorizo" },
  { categoryName: "Principios", name: "Lenteja", price: 0, description: "Lentejas con tocino" },
  { categoryName: "Principios", name: "Zanahoria", price: 0, description: "Zanahoria salteada con arveja" },
  { categoryName: "Principios", name: "Papas con Maní", price: 0, description: "Papas cocidas en salsa de maní" },
  { categoryName: "Principios", name: "Pasta", price: 0, description: "Pasta corta en salsa blanca o roja" },
  { categoryName: "Principios", name: "Arveja Fresca", price: 0, description: "Arveja verde natural" },
  { categoryName: "Principios", name: "Frijol Blanco", price: 0, description: "Frijoles blancos con pezuña" },
  { categoryName: "Principios", name: "Puré de Plátano", price: 0, description: "Puré de plátano maduro" },

  // Proteínas $10,000
  { categoryName: "Proteínas", name: "Chuleta de Cerdo", price: 10000, description: "Cerdo apanado" },
  { categoryName: "Proteínas", name: "Chuleta de Pollo", price: 10000, description: "Pollo apanado" },
  { categoryName: "Proteínas", name: "Pechuga a la Plancha", price: 10000, description: "Pechuga de pollo a la plancha" },
  { categoryName: "Proteínas", name: "Cerdo a la Plancha", price: 10000, description: "Lomo de cerdo a la plancha" },
  { categoryName: "Proteínas", name: "Pollo Frito", price: 10000, description: "Presa de pollo frita" },
  { categoryName: "Proteínas", name: "Pollo en Salsa", price: 10000, description: "Pollo guisado en salsa" },
  { categoryName: "Proteínas", name: "Pollo Sudado", price: 10000, description: "Pollo sudado con papa y yuca" },
  { categoryName: "Proteínas", name: "Hígado Sudado", price: 10000, description: "Hígado de res en salsa" },
  { categoryName: "Proteínas", name: "Hígado a la Plancha", price: 10000, description: "Hígado de res con cebolla" },
  { categoryName: "Proteínas", name: "Albóndigas", price: 10000, description: "Albóndigas de res en salsa" },

  // Proteínas $11,000
  { categoryName: "Proteínas", name: "Res Sudada", price: 11000, description: "Carne de res sudada" },
  { categoryName: "Proteínas", name: "Res a la Plancha", price: 11000, description: "Carne de res a la plancha" },
  { categoryName: "Proteínas", name: "Sierra Frita", price: 11000, description: "Pescado sierra frito" },
  { categoryName: "Proteínas", name: "Sierra Sudada", price: 11000, description: "Pescado sierra sudado" },

  // Bebidas
  { categoryName: "Bebidas", name: "Jugo de Lulo", price: 0, description: "Jugo natural de lulo" },
  { categoryName: "Bebidas", name: "Jugo de Tomate", price: 0, description: "Jugo natural de tomate de árbol" },
  { categoryName: "Bebidas", name: "Jugo de Mora", price: 0, description: "Jugo natural de mora" },
  { categoryName: "Bebidas", name: "Jugo de Piña", price: 0, description: "Jugo natural de piña" },
  { categoryName: "Bebidas", name: "Jugo Tomate-Piña", price: 0, description: "Mezcla natural de tomate y piña" },
  { categoryName: "Bebidas", name: "Limonada", price: 0, description: "Limonada natural" },
  { categoryName: "Bebidas", name: "Aguapanela", price: 0, description: "Aguapanela fría o caliente" },
  { categoryName: "Bebidas", name: "Agua Botella", price: 2000, description: "Agua mineral 500ml" },
  { categoryName: "Bebidas", name: "Gaseosa", price: 2500, description: "Gaseosa personal" },

  // Ensaladas
  { categoryName: "Ensaladas", name: "Ensalada Rusa", price: 0, description: "Papa, zanahoria, arveja y mayonesa" },
  { categoryName: "Ensaladas", name: "Ensalada Dulce", price: 0, description: "Repollo, piña y pasas" },
  { categoryName: "Ensaladas", name: "Ensalada de la Casa", price: 0, description: "Lechuga, tomate, cebolla y vinagreta" },
  { categoryName: "Ensaladas", name: "Ensalada de Aguacate", price: 0, description: "Aguacate, cebolla y cilantro" },

  // Extras
  { categoryName: "Extras", name: "Papas Fritas", price: 3000, description: "Porción de papas a la francesa" },
  { categoryName: "Extras", name: "Maduro Frito", price: 3000, description: "Porción de plátano maduro frito" },
  { categoryName: "Extras", name: "Huevo Frito", price: 1500, description: "Huevo frito adicional" },
  { categoryName: "Extras", name: "Patacón", price: 2000, description: "Patacón con ahogao" },
  { categoryName: "Extras", name: "Arepa con Queso", price: 2500, description: "Arepa de maíz con queso" },
];

export async function seedItems() {
  logger.info("🌱 Seeding items...");
  const restaurants = await prisma.restaurant.findMany();

  for (const restaurant of restaurants) {
    const items = sazonarteItems;

    for (const item of items) {
      const category = await prisma.menuCategory.findFirst({
        where: { restaurantId: restaurant.id, name: item.categoryName },
      });

      if (category) {
        await prisma.menuItem.upsert({
          where: {
            restaurantId_categoryId_name: {
              restaurantId: restaurant.id,
              categoryId: category.id,
              name: item.name,
            },
          },
          update: {
            price: item.price,
            description: item.description,
          },
          create: {
            restaurantId: restaurant.id,
            categoryId: category.id,
            name: item.name,
            description: item.description,
            price: item.price,
            inventoryType: "UNLIMITED",
          },
        });
      }
    }
  }
  logger.info("✅ Items seeded successfully!");
}
