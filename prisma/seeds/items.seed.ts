import { PrismaClient } from "@prisma/client";
import { logger } from "../../src/config/logger";

const prisma = new PrismaClient();

const sazonarteItems = [
  // Sopas
  {
    categoryName: "Sopas",
    name: "Sopa de Avena",
    price: 0,
    description: "Sopa cremosa preparada con hojuelas de avena, leche, un toque de cilantro y papas picadas.",
  },
  {
    categoryName: "Sopas",
    name: "Sopa de Quinoa",
    price: 0,
    description: "Sopa nutritiva cargada de quinoa orgánica, verduras frescas de temporada y legumbres.",
  },
  {
    categoryName: "Sopas",
    name: "Sopa de Cebada",
    price: 0,
    description: "Sopa tradicional de cebada perlada cocida a fuego lento con trozos de carne de res y vegetales.",
  },
  {
    categoryName: "Sopas",
    name: "Sopa de Cebada Perlada",
    price: 0,
    description: "Versión especial de cebada con una textura más suave, acompañada de verduras seleccionadas.",
  },
  {
    categoryName: "Sopas",
    name: "Sopa de Pasta",
    price: 0,
    description: "Clásica sopa de menudencias preparada con pasta corta, papa y un toque de especias naturales.",
  },
  {
    categoryName: "Sopas",
    name: "Sopa de Plátano",
    price: 0,
    description: "Sopa espesa de plátano verde picado artesanalmente, con un sabor tradicional casero.",
  },
  {
    categoryName: "Sopas",
    name: "Sancocho",
    price: 0,
    description: "El rey de las sopas colombianas: caldo concentrado con plátano, yuca, papa y el sabor único del fogón.",
  },
  {
    categoryName: "Sopas",
    name: "Sopa de Choclo",
    price: 0,
    description: "Deliciosa sopa dulce y salada preparada con granos de maíz tierno (choclo) y leche.",
  },
  {
    categoryName: "Sopas",
    name: "Sopa de Maíz",
    price: 0,
    description: "Sopa tradicional de maíz blanco molido con el toque secreto de la casa.",
  },
  {
    categoryName: "Sopas",
    name: "Crema de Ahuyama",
    price: 0,
    description: "Crema aterciopelada de ahuyama asada, decorada con un toque de crema de leche.",
  },
  {
    categoryName: "Sopas",
    name: "Sopa de Tortilla",
    price: 0,
    description: "Caldo de pollo sazonado servido con tiras de tortilla de maíz crocantes y aguacate fresco.",
  },

  // Arroces
  {
    categoryName: "Arroces",
    name: "Arroz Blanco",
    price: 0,
    description: "Arroz de grano largo, suelto y perfectamente cocido con un toque de sal y aceite vegetal.",
  },
  {
    categoryName: "Arroces",
    name: "Arroz Integral",
    price: 0,
    description: "Opción saludable de arroz de grano entero, rico en fibra y cocido en su punto.",
  },
  {
    categoryName: "Arroces",
    name: "Arroz Verde",
    price: 0,
    description: "Arroz aromático preparado con una mezcla licuada de espinaca, cilantro y pimentón verde.",
  },
  {
    categoryName: "Arroces",
    name: "Arroz con Coco",
    price: 0,
    description: "Tradicional arroz de la costa, preparado con leche de coco natural y un toque dulce de panela.",
  },

  // Principios
  {
    categoryName: "Principios",
    name: "Frijol",
    price: 0,
    description: "Frijoles rojos cargamanto guisados con hogao casero y un toque de plátano maduro.",
  },
  {
    categoryName: "Principios",
    name: "Arveja Seca",
    price: 0,
    description: "Arveja amarilla de paquete, cocida hasta obtener una textura suave y sazonada con cebolla y tomate.",
  },
  {
    categoryName: "Principios",
    name: "Garbanzo",
    price: 0,
    description: "Garbanzos tiernos guisados con trozos de chorizo artesanal y especias de la casa.",
  },
  {
    categoryName: "Principios",
    name: "Lenteja",
    price: 0,
    description: "Lentejas preparadas con un sofrito de cebolla larga y trozos de tocino crujiente.",
  },
  {
    categoryName: "Principios",
    name: "Zanahoria",
    price: 0,
    description: "Zanahoria en cubos salteada con arveja verde tierna y un toque de mantequilla.",
  },
  {
    categoryName: "Principios",
    name: "Papas con Maní",
    price: 0,
    description: "Papas cocidas bañadas en una salsa cremosa de maní tostado y cebollín.",
  },
  {
    categoryName: "Principios",
    name: "Pasta",
    price: 0,
    description: "Pasta corta bañada en una salsa blanca de la casa o salsa roja tipo boloñesa.",
  },
  {
    categoryName: "Principios",
    name: "Arveja Fresca",
    price: 0,
    description: "Arveja verde natural desgranada y cocida suavemente con vegetales frescos.",
  },
  {
    categoryName: "Principios",
    name: "Frijol Blanco",
    price: 0,
    description: "Frijoles blancos cremosos cocidos con pezuña de cerdo para un sabor intenso y tradicional.",
  },
  {
    categoryName: "Principios",
    name: "Puré de Plátano",
    price: 0,
    description: "Plátano maduro machacado con mantequilla y un toque de queso rallado.",
  },

  // Proteínas $10,000
  {
    categoryName: "Proteínas",
    name: "Chuleta de Cerdo",
    price: 10000,
    description: "Corte de cerdo apanado con galleta y frito hasta quedar dorado y crujiente.",
  },
  {
    categoryName: "Proteínas",
    name: "Chuleta de Pollo",
    price: 10000,
    description: "Pechuga de pollo aplanada, apanada y frita, servida con un toque de limón.",
  },
  {
    categoryName: "Proteínas",
    name: "Pechuga a la Plancha",
    price: 10000,
    description: "Filete de pechuga de pollo marinado en finas hierbas y asado a la plancha sin grasa.",
  },
  {
    categoryName: "Proteínas",
    name: "Cerdo a la Plancha",
    price: 10000,
    description: "Lomo de cerdo tierno asado a la plancha con cebolla grillé opcional.",
  },
  {
    categoryName: "Proteínas",
    name: "Pollo Frito",
    price: 10000,
    description: "Presa de pollo seleccionada, sazonada y frita tradicionalmente.",
  },
  {
    categoryName: "Proteínas",
    name: "Pollo en Salsa",
    price: 10000,
    description: "Pollo cocido en una reducción de tomates maduros, cebolla y pimentón.",
  },
  {
    categoryName: "Proteínas",
    name: "Pollo Sudado",
    price: 10000,
    description: "Pollo cocido al vapor con su propio jugo, acompañado de papa y yuca cocida.",
  },
  {
    categoryName: "Proteínas",
    name: "Hígado Sudado",
    price: 10000,
    description: "Hígado de res tierno preparado en una generosa salsa de cebolla y tomate.",
  },
  {
    categoryName: "Proteínas",
    name: "Hígado a la Plancha",
    price: 10000,
    description: "Filete de hígado de res asado a la plancha con abundantes aros de cebolla blanca.",
  },
  {
    categoryName: "Proteínas",
    name: "Albóndigas",
    price: 10000,
    description: "Albóndigas caseras de carne de res, bañadas en una salsa criolla tradicional.",
  },

  // Proteínas $11,000
  {
    categoryName: "Proteínas",
    name: "Res Sudada",
    price: 11000,
    description: "Carne de res de primera calidad cocida a fuego lento con especias, papa y yuca.",
  },
  {
    categoryName: "Proteínas",
    name: "Res a la Plancha",
    price: 11000,
    description: "Corte seleccionado de res asado a la plancha al término deseado.",
  },
  {
    categoryName: "Proteínas",
    name: "Sierra Frita",
    price: 11000,
    description: "Rodaja de pescado sierra sazonada con ajo y sal, frita hasta estar crocante.",
  },
  {
    categoryName: "Proteínas",
    name: "Sierra Sudada",
    price: 11000,
    description: "Pescado sierra preparado en un guiso suave de coco o criollo con vegetales.",
  },

  // Bebidas
  {
    categoryName: "Bebidas",
    name: "Jugo de Lulo",
    price: 0,
    description: "Jugo natural preparado con pulpa fresca de lulo, refrescante y ácido.",
  },
  {
    categoryName: "Bebidas",
    name: "Jugo de Tomate",
    price: 0,
    description: "Jugo natural de tomate de árbol, preparado en agua o leche según prefiera.",
  },
  {
    categoryName: "Bebidas",
    name: "Jugo de Mora",
    price: 0,
    description: "Jugo natural de moras seleccionadas, rico en antioxidantes.",
  },
  {
    categoryName: "Bebidas",
    name: "Jugo de Piña",
    price: 0,
    description: "Refrescante jugo de piña oro miel natural.",
  },
  {
    categoryName: "Bebidas",
    name: "Jugo Tomate-Piña",
    price: 0,
    description: "Una mezcla exótica y refrescante de tomate de árbol y piña natural.",
  },
  {
    categoryName: "Bebidas",
    name: "Limonada",
    price: 0,
    description: "Limonada casera preparada con limones recién exprimidos y hielo.",
  },
  {
    categoryName: "Bebidas",
    name: "Aguapanela",
    price: 0,
    description: "Bebida tradicional de panela, disponible fría con limón o caliente.",
  },
  {
    categoryName: "Bebidas",
    name: "Agua Botella",
    price: 2000,
    description: "Botella de agua mineral de 500ml, con o sin gas.",
  },
  {
    categoryName: "Bebidas",
    name: "Gaseosa",
    price: 2500,
    description: "Gaseosa personal de diferentes sabores (Coca-Cola, Postobón).",
  },

  // Ensaladas
  {
    categoryName: "Ensaladas",
    name: "Ensalada Rusa",
    price: 0,
    description: "Mezcla clásica de papa cocida, zanahoria, arveja verde y mayonesa cremosa.",
  },
  {
    categoryName: "Ensaladas",
    name: "Ensalada Dulce",
    price: 0,
    description: "Repollo finamente picado con trozos de piña en almíbar, uvas pasas y crema agria.",
  },
  {
    categoryName: "Ensaladas",
    name: "Ensalada de la Casa",
    price: 0,
    description: "Mezcla de lechuga fresca, rodajas de tomate, cebolla cabezona y vinagreta balsámica.",
  },
  {
    categoryName: "Ensaladas",
    name: "Ensalada de Aguacate",
    price: 0,
    description: "Cubos de aguacate hass, cebolla morada en plumas, cilantro y limón.",
  },

  // Extras
  {
    categoryName: "Extras",
    name: "Papas Fritas",
    price: 3000,
    description: "Porción generosa de papas cortadas en bastones y fritas al momento.",
  },
  {
    categoryName: "Extras",
    name: "Maduro Frito",
    price: 3000,
    description: "Plátano maduro frito en tajadas o entero, dulce y suave.",
  },
  {
    categoryName: "Extras",
    name: "Huevo Frito",
    price: 1500,
    description: "Huevo frito adicional preparado al gusto (yema blanda o dura).",
  },
  {
    categoryName: "Extras",
    name: "Patacón",
    price: 2000,
    description: "Patacón de plátano verde, crocante y servido con ahogao casero.",
  },
  {
    categoryName: "Extras",
    name: "Arepa con Queso",
    price: 2500,
    description: "Arepa de maíz blanco asada a la plancha con queso mozzarella derretido.",
  },
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
