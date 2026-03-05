import { PrismaClient } from "@prisma/client";
import { logger } from "../../src/config/logger";

const prisma = new PrismaClient();

const sazonarteItems = [
  // Sopas
  {
    categoryName: "Sopas",
    name: "Sopa de Avena",
    price: 4000,
    description: "Nuestra famosa avena cremosa de cocción lenta, preparada con leche entera, papas tiernas y un toque final de cilantro fresco. Un abrazo al corazón.",
  },
  {
    categoryName: "Sopas",
    name: "Sopa de Quinoa",
    price: 4000,
    description: "Súper sopa nutritiva con granos de quinoa seleccionados, cargada de vegetales frescos de la huerta y un caldo sazonado con hierbas naturales.",
  },
  {
    categoryName: "Sopas",
    name: "Sopa de Cebada",
    price: 4000,
    description: "Tradición pura: cebada perlada cocida a fuego lento con trozos de carne de res premium y verduras picadas artesanalmente.",
  },
  {
    categoryName: "Sopas",
    name: "Sopa de Pasta",
    price: 4000,
    description: "El sabor del hogar en un plato. Pasta corta en un caldo ligero de menudencias con papas y el sazón secreto de nuestra cocina.",
  },
  {
    categoryName: "Sopas",
    name: "Sancocho",
    price: 4000,
    description: "El rey de la casa. Un caldo robusto y concentrado con plátano, yuca y papa, infusionado con el auténtico sabor del fogón tradicional.",
  },
  {
    categoryName: "Sopas",
    name: "Crema de Ahuyama",
    price: 4000,
    description: "Textura aterciopelada de ahuyama horneada, suavemente licuada y decorada con un hilo de crema de leche. Dulce, salada y deliciosa.",
  },

  // Arroces
  {
    categoryName: "Arroces",
    name: "Arroz Blanco",
    price: 3000,
    description: "Grano largo, suelto y brillante. Cocido en su punto exacto con un toque sutil de aceite vegetal.",
  },
  {
    categoryName: "Arroces",
    name: "Arroz Integral",
    price: 3000,
    description: "Opción ligera y rica en fibra. Grano entero cocido lentamente para mantener su textura firme y nutritiva.",
  },
  {
    categoryName: "Arroces",
    name: "Arroz con Coco",
    price: 3000,
    description: "Tradición caribeña en tu mesa. Preparado con leche de coco natural y un toque caramelizado de panela.",
  },

  // Principios
  {
    categoryName: "Principios",
    name: "Frijol",
    price: 3000,
    description: "Frijoles rojos cargamanto, guisados pacientemente con nuestro hogao casero y trozos de plátano maduro para un espesor natural.",
  },
  {
    categoryName: "Principios",
    name: "Lenteja",
    price: 3000,
    description: "Lentejas seleccionadas, sazonadas con un sofrito de cebolla larga y pequeños trozos de tocino crujiente para un sabor ahumado.",
  },
  {
    categoryName: "Principios",
    name: "Garbanzo",
    price: 3000,
    description: "Garbanzos tiernos cocidos con trozos de chorizo artesanal y una mezcla de especias cálidas que resaltan su sabor.",
  },
  {
    categoryName: "Principios",
    name: "Papas con Maní",
    price: 3000,
    description: "Una joya andina: papas blancas bañadas en una salsa generosa y cremosa de maní tostado y cebollín fresco.",
  },

  // Proteínas Cerdo y Pollo
  {
    categoryName: "Proteínas",
    name: "Chuleta de Cerdo",
    price: 6000,
    description: "Lomo de cerdo seleccionado, cubierto con nuestro apanado artesanal de galleta y frito hasta lograr un dorado perfecto y crocante.",
  },
  {
    categoryName: "Proteínas",
    name: "Chuleta de Pollo",
    price: 6000,
    description: "Filete de pechuga aplanado y marinado, apanado a mano y frito al momento. Servido con una rodaja de limón para el toque ácido perfecto.",
  },
  {
    categoryName: "Proteínas",
    name: "Pechuga a la Plancha",
    price: 6000,
    description: "Corte tierno de pechuga marinado en finas hierbas y asado a la plancha para resaltar su jugosidad natural sin grasas añadidas.",
  },
  {
    categoryName: "Proteínas",
    name: "Cerdo a la Plancha",
    price: 6000,
    description: "Lomo de cerdo magro asado a la plancha con un toque de ajo y sellado para mantener sus jugos. Opción ligera y deliciosa.",
  },
  {
    categoryName: "Proteínas",
    name: "Pollo Frito",
    price: 6000,
    description: "Presa de pollo de granja, sazonada con nuestra mezcla de 5 especias y frita a alta temperatura para una piel ultra crocante.",
  },
  {
    categoryName: "Proteínas",
    name: "Pollo Sudado",
    price: 6000,
    description: "Preparación clásica: pollo cocido en su propio vapor con papa y yuca, bañado en un guiso criollo de tomate y cebolla.",
  },

  // Proteínas Res y Pescado
  {
    categoryName: "Proteínas",
    name: "Res Sudada",
    price: 7000,
    description: "Posta de res de cocción lenta (4 horas) hasta que se deshace con el tenedor. Acompañada de su jugo natural, papa y yuca.",
  },
  {
    categoryName: "Proteínas",
    name: "Sierra Frita",
    price: 7000,
    description: "Rodaja de pescado Sierra fresco, marinado en limón y ajo, frito hasta quedar crocante por fuera y tierno por dentro.",
  },

  // Bebidas
  {
    categoryName: "Bebidas",
    name: "Jugo de Lulo",
    price: 1000,
    description: "Fruta 100% natural. Refrescante, ácido y preparado al instante para conservar toda su vitamina C.",
  },
  {
    categoryName: "Bebidas",
    name: "Limonada",
    price: 1000,
    description: "Limones frescos exprimidos a mano con el equilibrio perfecto de dulce y hielo. La compañía ideal.",
  },
  {
    categoryName: "Bebidas",
    name: "Gaseosa",
    price: 3000,
    description: "Variedad de sabores en presentación personal fría.",
  },
  {
    categoryName: "Bebidas",
    name: "Gaseosa Pequeña",
    price: 1200,
    description: "Presentación pequeña perfecta para acompañar tu almuerzo.",
  },
  {
    categoryName: "Bebidas",
    name: "Agua",
    price: 2000,
    description: "Agua purificada fría.",
  },

  // Ensaladas
  {
    categoryName: "Ensaladas",
    name: "Ensalada Verde",
    price: 2000,
    description: "Mezcla de lechugas frescas con tomate, cebolla y aderezo de la casa.",
  },

  // Extras
  {
    categoryName: "Extras",
    name: "Papas Fritas",
    price: 2000,
    description: "Bastones de papa natural fritos al momento, crocantes y con el punto justo de sal marina.",
  },
  {
    categoryName: "Extras",
    name: "Plátano",
    price: 2000,
    description: "Rodajas de plátano maduro fritas, dorado y dulce.",
  },
  {
    categoryName: "Extras",
    name: "Huevo Frito",
    price: 1000,
    description: "Huevo fresco de campo preparado al gusto: yema blandita para mojar o bien cocida.",
  },
  {
    categoryName: "Extras",
    name: "Porción Individual",
    price: 2000,
    description: "Porción individual de acompañamiento.",
  },
  {
    categoryName: "Extras",
    name: "Portacomida",
    price: 1000,
    description: "Empaque térmico de alta calidad para mantener tu comida caliente y segura durante el transporte.",
  },

  // Items adicionales que existían en DB con precio 0
  {
    categoryName: "Sopas",
    name: "Sopa de Cebada Perlada",
    price: 4000,
    description: "Sopa cremosa de cebada perlada con vegetales frescos.",
  },
  {
    categoryName: "Sopas",
    name: "Sopa de Plátano",
    price: 4000,
    description: "Sopa tradicional de plátano con carne molida.",
  },
  {
    categoryName: "Sopas",
    name: "Sopa de Choclo",
    price: 4000,
    description: "Sopa cremosa de choclo con pollo y verduras.",
  },
  {
    categoryName: "Sopas",
    name: "Sopa de Maíz",
    price: 4000,
    description: "Sopa de maíz tierno con trozos de pollo.",
  },
  {
    categoryName: "Sopas",
    name: "Sopa de Tortilla",
    price: 4000,
    description: "Sopa de tortilla con aguacate y queso.",
  },
  {
    categoryName: "Arroces",
    name: "Arroz Verde",
    price: 3000,
    description: "Arroz blanco con cilantro y cebolla.",
  },
  {
    categoryName: "Principios",
    name: "Arveja Seca",
    price: 3000,
    description: "Arveja guisada con tocino y chorizo.",
  },
  {
    categoryName: "Principios",
    name: "Zanahoria",
    price: 3000,
    description: "Zanahoria guisada en salsa de tomate.",
  },
  {
    categoryName: "Principios",
    name: "Pasta",
    price: 3000,
    description: "Pasta en salsa de tomate casera.",
  },
  {
    categoryName: "Principios",
    name: "Arveja Fresca",
    price: 3000,
    description: "Arveja fresca con maíz y mantequilla.",
  },
  {
    categoryName: "Principios",
    name: "Frijol Blanco",
    price: 3000,
    description: "Frijoles blancos en salsa de tomate.",
  },
  {
    categoryName: "Principios",
    name: "Puré de Plátano",
    price: 3000,
    description: "Puré de plátano maduro con mantequilla.",
  },
  {
    categoryName: "Bebidas",
    name: "Jugo de Mora",
    price: 1000,
    description: "Jugo natural de mora fresca.",
  },
  {
    categoryName: "Bebidas",
    name: "Jugo de Piña",
    price: 1000,
    description: "Jugo natural de piña fresca.",
  },
  {
    categoryName: "Bebidas",
    name: "Jugo de Tomate",
    price: 1000,
    description: "Jugo natural de tomate de árbol.",
  },
  {
    categoryName: "Bebidas",
    name: "Jugo Tomate-Piña",
    price: 1000,
    description: "Mezcla de tomate de árbol y piña.",
  },
  {
    categoryName: "Bebidas",
    name: "Aguapanela",
    price: 1000,
    description: "Aguapanela con queso.",
  },
  {
    categoryName: "Ensaladas",
    name: "Ensalada Rusa",
    price: 2000,
    description: "Ensalada de papa, zanahoria, mayonesa y arveja.",
  },
  {
    categoryName: "Ensaladas",
    name: "Ensalada Dulce",
    price: 2000,
    description: "Ensalada de frutas frescas.",
  },
  {
    categoryName: "Ensaladas",
    name: "Ensalada de la Casa",
    price: 2000,
    description: "Mezcla de lechugas con tomate, cebolla y aderezo.",
  },
  {
    categoryName: "Ensaladas",
    name: "Ensalada de Aguacate",
    price: 2000,
    description: "Aguacate con tomate, cebolla y limón.",
  },
];

export async function seedItems() {
  logger.info("🌱 Seeding items with premium descriptions...");
  const restaurants = await prisma.restaurant.findMany();

  for (const restaurant of restaurants) {
    for (const item of sazonarteItems) {
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
  logger.info("✅ Items with premium descriptions seeded successfully!");
}