import { PrismaClient } from "@prisma/client";
import { logger } from "../../src/config/logger";

const prisma = new PrismaClient();

export const itemsConfig = [
  // PROTEÍNAS (6,000 - 7,000)
  {
    name: "Chuleta de Cerdo Apanada",
    description: "Tierna chuleta de cerdo premium, marinada en finas hierbas y apanada con una costra crujiente y dorada al estilo artesanal.",
    price: 6000,
    categoryName: "Proteínas",
    isAvailable: true,
  },
  {
    name: "Chuleta de Pollo a la Crocante",
    description: "Filete de pechuga de pollo seleccionado, con un rebozado especial de la casa que garantiza una textura extra crujiente por fuera y jugosa por dentro.",
    price: 6000,
    categoryName: "Proteínas",
    isAvailable: true,
  },
  {
    name: "Cerdo a la Plancha",
    description: "Lomo de cerdo magro sellado a fuego alto en su propio jugo, sazonado con sal marina y pimienta recién molida para un sabor natural y ahumado.",
    price: 6000,
    categoryName: "Proteínas",
    isAvailable: true,
  },
  {
    name: "Pechuga a la Plancha",
    description: "Delicado filete de pechuga de pollo asado lentamente a la plancha, resaltando su suavidad con un toque de ajo y especias naturales.",
    price: 6000,
    categoryName: "Proteínas",
    isAvailable: true,
  },
  {
    name: "Res a la Plancha",
    description: "Corte seleccionado de res de primera calidad, asado al término ideal para conservar su terneza y sabor intenso a carne de campo.",
    price: 7000,
    categoryName: "Proteínas",
    isAvailable: true,
  },
  {
    name: "Pollo Frito Tradicional",
    description: "Presa de pollo marinado durante 24 horas y frito hasta obtener un dorado perfecto y una piel irresistiblemente tostada.",
    price: 6000,
    categoryName: "Proteínas",
    isAvailable: true,
  },
  {
    name: "Pollo en Salsa de la Casa",
    description: "Jugoso pollo cocinado a fuego lento en una reducción de tomates maduros, cebolla junca y especias secretas que crean una salsa espesa y llena de sabor.",
    price: 6000,
    categoryName: "Proteínas",
    isAvailable: true,
  },
  {
    name: "Sierra Frita del Pacífico",
    description: "Medallón de sierra fresca, sazonada con limón y sal de mar, frita hasta alcanzar una textura firme y un sabor costero auténtico.",
    price: 7000,
    categoryName: "Proteínas",
    isAvailable: true,
  },

  // PRINCIPIOS
  {
    name: "Frijoles de la Abuela",
    description: "Frijoles cargamanto cocidos lentamente con trozos de plátano maduro y un guiso tradicional de hogao, logrando una textura cremosa y reconfortante.",
    price: 0, // Generalmente incluidos en el menú, se ponen a 0 si es base
    categoryName: "Principios",
    isAvailable: true,
  },
  {
    name: "Garbanzos Especiales",
    description: "Tiernos garbanzos preparados con un fondo de verduras y especias que realzan su sabor natural, ideales para un almuerzo nutritivo.",
    price: 0,
    categoryName: "Principios",
    isAvailable: true,
  },
  {
    name: "Lentejas con Hogao",
    description: "Lentejas seleccionadas cocidas en su punto exacto, acompañadas de un sofrito de cebolla y tomate que le da ese toque casero inconfundible.",
    price: 0,
    categoryName: "Principios",
    isAvailable: true,
  },
  {
    name: "Arveja Amarilla Guisada",
    description: "Tradicional preparación de arvejas secas, cocidas hasta que están tiernas y bañadas en un guiso de cebolla y especias del campo.",
    price: 0,
    categoryName: "Principios",
    isAvailable: true,
  },

  // SOPAS
  {
    name: "Sopa de Avena Nutritiva",
    description: "Sopa suave y aterciopelada a base de avena en hojuelas, cocida con verduras frescas y un fondo de carne que le aporta profundidad.",
    price: 0,
    categoryName: "Sopas",
    isAvailable: true,
  },
  {
    name: "Sopa de Quinoa Real",
    description: "Superalimento andino preparado en un caldo ligero con vegetales de temporada, aportando una textura única y un alto valor nutricional.",
    price: 0,
    categoryName: "Sopas",
    isAvailable: true,
  },
  {
    name: "Sancocho de la Casa",
    description: "Nuestra versión del clásico: caldo robusto con plátano, yuca y papa, infusionado con cilantro y el secreto de nuestra cocina.",
    price: 0,
    categoryName: "Sopas",
    isAvailable: true,
  },
  {
    name: "Crema de Cebada Perlada",
    description: "Sopa tradicional de granos de cebada cocidos hasta su punto máximo de suavidad, enriquecida con cubos de papa y especias.",
    price: 0,
    categoryName: "Sopas",
    isAvailable: true,
  },

  // BEBIDAS
  {
    name: "Jugo de Lulo Natural",
    description: "Refrescante jugo de lulo 100% natural, preparado al momento para conservar su acidez característica y frescura.",
    price: 2500,
    categoryName: "Bebidas",
    isAvailable: true,
  },
  {
    name: "Jugo de Mora Silvestre",
    description: "Bebida elaborada con moras seleccionadas, perfecta para acompañar tu almuerzo con un sabor frutal intenso.",
    price: 2500,
    categoryName: "Bebidas",
    isAvailable: true,
  },
  {
    name: "Té Helado de la Casa",
    description: "Mezcla de té negro con toques cítricos y menta, endulzado ligeramente para una experiencia refrescante.",
    price: 3000,
    categoryName: "Bebidas",
    isAvailable: true,
  },
  {
    name: "Agua Mineral Embotellada",
    description: "Agua pura de manantial, ideal para quienes buscan una hidratación natural y sin calorías.",
    price: 2000,
    categoryName: "Bebidas",
    isAvailable: true,
  },

  // ENSALADAS
  {
    name: "Ensalada Tropical de Mango",
    description: "Mix de lechugas frescas, trozos de mango dulce, piña calada y una delicada vinagreta cítrica de la casa.",
    price: 0,
    categoryName: "Ensaladas",
    isAvailable: true,
  },
  {
    name: "Ensalada de la Casa Cremosa",
    description: "Finas tiras de repollo morado y blanco con zanahoria rallada, integradas en un aderezo cremoso agridulce.",
    price: 0,
    categoryName: "Ensaladas",
    isAvailable: true,
  },
  {
    name: "Ensalada Primavera Fresca",
    description: "Combinación clásica de pepino, tomate chonto y cebolla roja, marinada con limón fresco y cilantro picado.",
    price: 0,
    categoryName: "Ensaladas",
    isAvailable: true,
  },

  // ARROCES
  {
    name: "Arroz Blanco Tradicional",
    description: "Arroz de grano largo cocido en su punto exacto, suelto, blanco y con el toque ideal de sal y ajo.",
    price: 0,
    categoryName: "Arroces",
    isAvailable: true,
  },
  {
    name: "Arroz Integral con Linaza",
    description: "Opción saludable de arroz integral de grano entero, cocido lentamente para mantener su textura firme y valor fibroso.",
    price: 0,
    categoryName: "Arroces",
    isAvailable: true,
  },
  {
    name: "Arroz Verde al Cilantro",
    description: "Arroz aromático infusionado con una base de espinaca y cilantro fresco, aportando un color vibrante y un sabor herbal.",
    price: 0,
    categoryName: "Arroces",
    isAvailable: true,
  },

  // EXTRAS
  {
    name: "Porción de Papa Frita",
    description: "Papas cortadas en bastones, fritas hasta obtener un exterior crujiente y un centro suave y harinoso.",
    price: 3000,
    categoryName: "Extras",
    isAvailable: true,
  },
  {
    name: "Tajadas de Plátano Maduro",
    description: "Plátano maduro seleccionado, frito en láminas doradas que resaltan su dulzor natural.",
    price: 2000,
    categoryName: "Extras",
    isAvailable: true,
  },
  {
    name: "Huevo Frito con Puntilla",
    description: "Huevo fresco preparado al momento con el borde tostado y la yema en el punto de su preferencia.",
    price: 1500,
    categoryName: "Extras",
    isAvailable: true,
  },
];

export async function seedItems() {
  logger.info("🌱 Cleaning existing menu data...");
  
  // Delete related data in order to allow menu item deletion
  await prisma.stockAdjustment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.menuItem.deleteMany();

  logger.info("🌱 Seeding menu items...");

  // Get all categories to map names to IDs
  const categories = await prisma.menuCategory.findMany();
  const categoryMap = new Map(categories.map((c) => [c.name, c.id]));

  for (const item of itemsConfig) {
    const categoryId = categoryMap.get(item.categoryName);

    if (!categoryId) {
      logger.warn(`⚠️ Category "${item.categoryName}" not found for item "${item.name}". Skipping.`);
      continue;
    }

    await prisma.menuItem.upsert({
      where: {
        categoryId_name: {
          categoryId: categoryId,
          name: item.name,
        },
      },
      update: {
        description: item.description,
        price: item.price,
        isAvailable: item.isAvailable,
      },
      create: {
        name: item.name,
        description: item.description,
        price: item.price,
        categoryId: categoryId,
        isAvailable: item.isAvailable,
      },
    });
  }

  logger.info(`✅ Menu items seeded successfully!`);
}
