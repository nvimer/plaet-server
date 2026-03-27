import { PrismaClient } from "@prisma/client";
import { logger } from "../../src/config/logger";

const prisma = new PrismaClient();

const sazonarteItems = [
  // Sopas ($4000) - Enfoque en cocción lenta, nutrición y sabor a hogar
  {
    categoryName: "Sopas",
    name: "Sopa de Avena",
    price: 4000,
    description:
      "Nuestra famosa avena cremosa de cocción lenta, preparada con leche entera, papas tiernas y un toque final de cilantro fresco. Un abrazo al corazón.",
  },
  {
    categoryName: "Sopas",
    name: "Sopa de Quinoa",
    price: 4000,
    description:
      "Súper sopa nutritiva con granos de quinoa seleccionados, cargada de vegetales frescos de la huerta y un caldo sazonado con hierbas naturales.",
  },
  {
    categoryName: "Sopas",
    name: "Sopa de Cebada",
    price: 4000,
    description:
      "Tradición pura: cebada perlada cocida a fuego lento con trozos de carne de res premium y verduras picadas artesanalmente.",
  },
  {
    categoryName: "Sopas",
    name: "Sopa de Pasta",
    price: 4000,
    description:
      "El sabor del hogar en un plato. Pasta corta en un caldo ligero de menudencias con papas y el sazón secreto de nuestra cocina.",
  },
  {
    categoryName: "Sopas",
    name: "Sancocho",
    price: 4000,
    description:
      "El rey de la casa. Un caldo robusto y concentrado con plátano, yuca y papa, infusionado con el auténtico sabor del fogón tradicional.",
  },
  {
    categoryName: "Sopas",
    name: "Crema de Ahuyama",
    price: 4000,
    description:
      "Textura aterciopelada de ahuyama horneada, suavemente licuada y decorada con un hilo de crema de leche. Dulce, salada y deliciosa.",
  },
  {
    categoryName: "Sopas",
    name: "Sopa de Cebada Perlada",
    price: 4000,
    description:
      "Un clásico reconfortante. Suave crema de cebada perlada cocida pacientemente, enriquecida con una fina selección de vegetales frescos del campo.",
  },
  {
    categoryName: "Sopas",
    name: "Sopa de Plátano",
    price: 4000,
    description:
      "El auténtico sabor de las abuelas. Sustancioso caldo a base de plátano verde rallado, acompañado de jugosa carne molida y nuestro sofrito criollo.",
  },
  {
    categoryName: "Sopas",
    name: "Sopa de Choclo",
    price: 4000,
    description:
      "Equilibrio perfecto entre dulce y salado. Exquisita base de choclo tierno licuado, acompañada de pollo desmechado y verduras en su punto.",
  },
  {
    categoryName: "Sopas",
    name: "Sopa de Maíz",
    price: 4000,
    description:
      "Sabor campesino en cada cucharada. Caldo ligero y sabroso con abundantes granos de maíz tierno dulce y tiernos trozos de pollo.",
  },
  {
    categoryName: "Sopas",
    name: "Sopa de Tortilla",
    price: 4000,
    description:
      "Inspiración mexicana con toque local. Caldo especiado coronado con tiras de tortilla crocante, cubos de aguacate fresco y queso fundido.",
  },

  // Arroces ($3000) - Enfoque en textura, grano y acompañamiento perfecto
  {
    categoryName: "Arroces",
    name: "Arroz Blanco",
    price: 3000,
    description:
      "Grano largo, suelto y brillante. Cocido en su punto exacto con un toque sutil de aceite vegetal y sal marina.",
  },
  {
    categoryName: "Arroces",
    name: "Arroz Integral",
    price: 3000,
    description:
      "Opción ligera y rica en fibra. Grano entero cocido lentamente para mantener su textura firme y sus propiedades nutritivas.",
  },
  {
    categoryName: "Arroces",
    name: "Arroz con Coco",
    price: 3000,
    description:
      "Tradición caribeña en tu mesa. Preparado con leche de coco natural y un toque caramelizado de panela oscura.",
  },
  {
    categoryName: "Arroces",
    name: "Arroz Verde",
    price: 3000,
    description:
      "El acompañante aromático ideal. Grano suelto e impregnado del sabor fresco del cilantro licuado y un delicado sofrito de cebolla.",
  },

  // Principios ($3000) - Enfoque en guisos caseros, salsas y tiempo de preparación
  {
    categoryName: "Principios",
    name: "Frijol",
    price: 3000,
    description:
      "Frijoles rojos cargamanto, guisados pacientemente con nuestro hogao casero y trozos de plátano maduro para un espesor natural.",
  },
  {
    categoryName: "Principios",
    name: "Lenteja",
    price: 3000,
    description:
      "Lentejas seleccionadas, sazonadas con un sofrito de cebolla larga y pequeños trozos de tocino crujiente para un sabor ahumado.",
  },
  {
    categoryName: "Principios",
    name: "Garbanzo",
    price: 3000,
    description:
      "Garbanzos tiernos cocidos con trozos de chorizo artesanal y una mezcla de especias cálidas que resaltan su sabor.",
  },
  {
    categoryName: "Principios",
    name: "Papas con Maní",
    price: 3000,
    description:
      "Una joya andina: papas blancas tiernas bañadas en una salsa generosa y cremosa de maní tostado y cebollín fresco.",
  },
  {
    categoryName: "Principios",
    name: "Arveja Seca",
    price: 3000,
    description:
      "Textura y sabor inigualables. Arvejas guisadas pacientemente hasta alcanzar la cremosidad ideal, acompañadas de tocino y chorizo.",
  },
  {
    categoryName: "Principios",
    name: "Zanahoria",
    price: 3000,
    description:
      "Un toque dulce y reconfortante. Cubos tiernos de zanahoria cocinados a fuego lento en nuestra reducción de salsa de tomate casera y finas hierbas.",
  },
  {
    categoryName: "Principios",
    name: "Pasta",
    price: 3000,
    description:
      "Al dente y deliciosa. Pasta corta bañada en nuestra exclusiva salsa napolitana natural, preparada con tomates maduros y albahaca.",
  },
  {
    categoryName: "Principios",
    name: "Arveja Fresca",
    price: 3000,
    description:
      "Puro sabor de campo. Arvejas verdes tiernas salteadas con jugosos granos de maíz dulce y un toque suave de mantequilla derretida.",
  },
  {
    categoryName: "Principios",
    name: "Frijol Blanco",
    price: 3000,
    description:
      "Suaves y cremosos. Frijoles blancos cocidos a la perfección y envueltos en un guiso espeso de tomate criollo y especias tradicionales.",
  },
  {
    categoryName: "Principios",
    name: "Puré de Plátano",
    price: 3000,
    description:
      "Dulzor natural irresistible. Plátano muy maduro horneado y majado a mano, emulsionado con mantequilla para una textura melosa.",
  },

  // Proteínas ($6000 - $7000) - Enfoque en calidad de cortes, marinados y técnicas de asado/fritura
  {
    categoryName: "Proteínas",
    name: "Chuleta de Cerdo",
    price: 6000,
    description:
      "Lomo de cerdo seleccionado, cubierto con nuestro apanado artesanal de galleta y frito hasta lograr un dorado perfecto y crocante.",
  },
  {
    categoryName: "Proteínas",
    name: "Chuleta de Pollo",
    price: 6000,
    description:
      "Filete de pechuga aplanado y marinado, apanado a mano y frito al momento. Servido con una rodaja de limón para el toque ácido perfecto.",
  },
  {
    categoryName: "Proteínas",
    name: "Pechuga a la Plancha",
    price: 6000,
    description:
      "Corte tierno de pechuga marinado en finas hierbas y asado a la plancha para resaltar su jugosidad natural sin grasas añadidas.",
  },
  {
    categoryName: "Proteínas",
    name: "Cerdo a la Plancha",
    price: 6000,
    description:
      "Lomo de cerdo magro asado a la plancha con un toque de ajo y sellado para mantener sus jugos. Opción ligera y deliciosa.",
  },
  {
    categoryName: "Proteínas",
    name: "Pollo Frito",
    price: 6000,
    description:
      "Presa de pollo de granja, sazonada con nuestra mezcla de 5 especias y frita a alta temperatura para una piel ultra crocante.",
  },
  {
    categoryName: "Proteínas",
    name: "Pollo Sudado",
    price: 6000,
    description:
      "Preparación clásica: pollo cocido en su propio vapor con papa y yuca, bañado en un guiso criollo de tomate y cebolla.",
  },
  {
    categoryName: "Proteínas",
    name: "Res Sudada",
    price: 7000,
    description:
      "Posta de res de cocción lenta (4 horas) hasta que se deshace con el tenedor. Acompañada de su jugo natural, papa y yuca.",
  },
  {
    categoryName: "Proteínas",
    name: "Sierra Frita",
    price: 7000,
    description:
      "Rodaja de pescado Sierra fresco, marinado en limón y ajo, frita hasta quedar crocante por fuera y tierna por dentro.",
  },
  {
    categoryName: "Proteínas",
    name: "Res a la Plancha",
    price: 7000,
    description:
      "Corte magro de res premium, sazonado con sal marina y pimienta negra, asado a la plancha en su propio jugo para una textura tierna.",
  },

  // Bebidas ($1000 - $3000) - Enfoque en frescura, preparadas al instante y refrigeración
  {
    categoryName: "Bebidas",
    name: "Jugo de Lulo",
    price: 1000,
    description:
      "Fruta 100% natural. Refrescante, ácido y preparado al instante para conservar toda su frescura y vitamina C.",
  },
  {
    categoryName: "Bebidas",
    name: "Limonada",
    price: 1000,
    description:
      "Limones frescos exprimidos a mano con el equilibrio perfecto de dulzor y hielo. La compañía ideal para tu almuerzo.",
  },
  {
    categoryName: "Bebidas",
    name: "Jugo de Mora",
    price: 1000,
    description:
      "Intenso y refrescante. Preparado al instante con moras de castilla seleccionadas, logrando el equilibrio perfecto entre dulce y cítrico.",
  },
  {
    categoryName: "Bebidas",
    name: "Jugo de Piña",
    price: 1000,
    description:
      "Un sorbo tropical. Piña oro miel 100% fresca, licuada y servida bien fría para calmar la sed y refrescar tu día.",
  },
  {
    categoryName: "Bebidas",
    name: "Jugo de Tomate",
    price: 1000,
    description:
      "El sabor de siempre. Delicioso jugo de tomate de árbol recién preparado, con un toque suave de dulzor y servido helado.",
  },
  {
    categoryName: "Bebidas",
    name: "Jugo Tomate-Piña",
    price: 1000,
    description:
      "La combinación perfecta. Una mezcla exótica, vibrante y dulce de tomate de árbol y piña fresca que sorprenderá tu paladar.",
  },
  {
    categoryName: "Bebidas",
    name: "Aguapanela",
    price: 1000,
    description:
      "Nuestra bebida insignia. Auténtica infusión de panela de caña servida en su punto, acompañada de un fundido trozo de queso campesino.",
  },
  {
    categoryName: "Bebidas",
    name: "Gaseosa",
    price: 3000,
    description:
      "Bebida carbonatada fría en presentación personal, ideal para acompañar tus comidas con tu sabor favorito.",
  },
  {
    categoryName: "Bebidas",
    name: "Gaseosa Pequeña",
    price: 1200,
    description:
      "El tamaño perfecto para quitar el antojo. Presentación personal pequeña servida burbujeante y bien fría.",
  },
  {
    categoryName: "Bebidas",
    name: "Agua",
    price: 2000,
    description:
      "Agua purificada y cristalina, servida fría para refrescar e hidratar tu cuerpo.",
  },

  // Ensaladas ($2000) - Enfoque en frescura de vegetales, colores y aderezos
  {
    categoryName: "Ensaladas",
    name: "Ensalada Verde",
    price: 2000,
    description:
      "Mezcla crujiente de lechugas frescas recién lavadas con tomate rojo, aros de cebolla y nuestra vinagreta ligera de la casa.",
  },
  {
    categoryName: "Ensaladas",
    name: "Ensalada Rusa",
    price: 2000,
    description:
      "Un clásico infaltable. Suaves cubos de papa y zanahoria, mezclados con arvejas tiernas y envueltos en una cremosa mayonesa artesanal.",
  },
  {
    categoryName: "Ensaladas",
    name: "Ensalada Dulce",
    price: 2000,
    description:
      "Frescura en cada bocado. Una vibrante y colorida mezcla de frutas tropicales de temporada, cortadas frescas al momento.",
  },
  {
    categoryName: "Ensaladas",
    name: "Ensalada de la Casa",
    price: 2000,
    description:
      "Nuestra firma verde. Crujiente selección de lechugas, tomates maduros, cebolla pluma y el aderezo secreto que a todos encanta.",
  },
  {
    categoryName: "Ensaladas",
    name: "Ensalada de Aguacate",
    price: 2000,
    description:
      "Simplicidad y frescura. Generosas lajas de aguacate hass cremoso, coronadas con tomate rojo, cebolla y un toque de limón recién exprimido.",
  },

  // Extras ($1000 - $2000) - Justificación de pequeños cobros extra
  {
    categoryName: "Extras",
    name: "Papas Fritas",
    price: 2000,
    description:
      "Bastones de papa natural fritos al momento, logrando un exterior crocante, un interior tierno y el punto justo de sal marina.",
  },
  {
    categoryName: "Extras",
    name: "Plátano",
    price: 2000,
    description:
      "Jugosas rodajas de plátano bien maduro, fritas hasta alcanzar ese característico color dorado y su sabor dulce caramelizado.",
  },
  {
    categoryName: "Extras",
    name: "Huevo Frito",
    price: 1000,
    description:
      "Huevo fresco de campo preparado exactamente a tu gusto: con la yema blandita lista para mojar o bien cocida.",
  },
  {
    categoryName: "Extras",
    name: "Porción Individual",
    price: 2000,
    description:
      "Una ración extra y generosa de tu acompañamiento favorito, servida caliente y lista para complementar tu plato.",
  },
  {
    categoryName: "Extras",
    name: "Portacomida",
    price: 1000,
    description:
      "Empaque térmico y resistente de alta calidad para mantener la temperatura, frescura y seguridad de tu comida durante el transporte.",
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
