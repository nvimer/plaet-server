/**
 * Default menu categories for new restaurants.
 * These categories ensure the Corrientazo (Daily Menu) works correctly out of the box.
 */
export const DEFAULT_CATEGORIES = [
  { name: "Sopas", description: "Sopas y caldos tradicionales elaborados diariamente con ingredientes frescos y el sabor de casa.", order: 1 },
  { name: "Arroces", description: "Nuestra base infaltable: opciones de arroz siempre suelto y con el punto exacto de sazón.", order: 2 },
  { name: "Principios", description: "La esencia del menú: acompañamientos caseros calientes como frijoles, lentejas, garbanzos, pastas o verduras guisadas.", order: 3 },
  { name: "Proteínas", description: "Variedad de carnes, pollo o pescado con preparaciones clásicas: a la plancha, en salsa, sudadas o fritas.", order: 4 },
  { name: "Bebidas", description: "Opciones refrescantes para acompañar tu almuerzo, incluyendo jugos naturales del día y limonadas.", order: 5 },
  { name: "Extras", description: "Porciones adicionales para complementar tu plato a tu gusto, como aguacate, tajadas de plátano maduro o huevo frito.", order: 6 },
  { name: "Ensaladas", description: "Acompañamientos frescos y ligeros, preparados con vegetales de temporada y aderezos caseros.", order: 7 },
  { name: "Postres", description: "El toque dulce tradicional para cerrar el almuerzo, con opciones típicas y porciones justas.", order: 8 },
];

// deno-lint-ignore no-explicit-any
type Db = { from: (table: string) => any };

/** Creates the default categories for a restaurant that has none. Returns how many were created. */
export async function seedDefaultCategories(supabase: Db, restaurantId: string): Promise<number> {
  const { data: existing } = await supabase
    .from("menu_categories")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .eq("deleted", false)
    .limit(1);

  if (existing?.length) return 0;

  const { data, error } = await supabase
    .from("menu_categories")
    .insert(DEFAULT_CATEGORIES.map(c => ({
      name: c.name,
      description: c.description,
      order: c.order,
      restaurant_id: restaurantId,
    })))
    .select("id");

  if (error) {
    console.error("SEED DEFAULT CATEGORIES ERROR:", JSON.stringify(error));
    return 0;
  }
  return data?.length || 0;
}
