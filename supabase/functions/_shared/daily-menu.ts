// deno-lint-ignore no-explicit-any
type Db = { from: (table: string) => any };

/** Each slot of the corrientazo: its column prefix in daily_menus. */
export const DAILY_MENU_SLOTS = [
  "soup", "principle", "protein", "drink", "extra", "salad", "rice", "dessert",
] as const;

export type DailyMenuSlot = typeof DAILY_MENU_SLOTS[number];

export const DAILY_MENU_COLUMNS = [
  "id", `"isActive"`, "created_at", "updated_at", "base_price", "packaging_fee",
  "protein_ids", "restaurant_id",
  ...DAILY_MENU_SLOTS.flatMap(s => [`${s}_category_id`, `${s}_option_1_id`, `${s}_option_2_id`]),
].join(", ");

interface CategoryRow { id: number; name: string; description: string | null; order: number }
interface ItemRow { id: number; name: string; price: number; category_id: number; image_url: string | null }

/** Shapes a daily_menus row the way the client expects: categories and option lists per slot. */
export async function toDailyMenuResponse(supabase: Db, row: unknown) {
  // The select is a raw column list, so supabase-js can't type the row.
  const menu = row as Record<string, unknown> | null;
  if (!menu) return null;

  const categoryIds = DAILY_MENU_SLOTS
    .map(s => menu[`${s}_category_id`] as number | null)
    .filter((id): id is number => typeof id === "number");

  const optionIds = DAILY_MENU_SLOTS
    .flatMap(s => [menu[`${s}_option_1_id`], menu[`${s}_option_2_id`]] as (number | null)[])
    .filter((id): id is number => typeof id === "number");

  const proteinIds = (menu.protein_ids as number[] | null) || [];
  const itemIds = [...new Set([...optionIds, ...proteinIds])];

  const [{ data: categories }, { data: items }] = await Promise.all([
    categoryIds.length
      ? supabase.from("menu_categories").select(`id, name, description, "order"`).in("id", [...new Set(categoryIds)])
      : Promise.resolve({ data: [] as CategoryRow[] }),
    itemIds.length
      ? supabase.from("menu_items").select("id, name, price, category_id, image_url").in("id", itemIds)
      : Promise.resolve({ data: [] as ItemRow[] }),
  ]);

  const categoryById = new Map<number, CategoryRow>((categories || []).map((c: CategoryRow) => [c.id, c]));
  const itemById = new Map<number, ItemRow>((items || []).map((i: ItemRow) => [i.id, i]));

  const toOption = (id: unknown) => {
    const item = typeof id === "number" ? itemById.get(id) : undefined;
    return item
      ? { id: item.id, name: item.name, price: Number(item.price), categoryId: item.category_id, imageUrl: item.image_url }
      : null;
  };

  const response: Record<string, unknown> = {
    id: menu.id,
    isActive: menu.isActive ?? true,
    basePrice: Number(menu.base_price ?? 3000),
    packagingFee: Number(menu.packaging_fee ?? 1000),
    createdAt: menu.created_at,
    updatedAt: menu.updated_at,
    restaurantId: menu.restaurant_id,
  };

  for (const slot of DAILY_MENU_SLOTS) {
    const categoryId = menu[`${slot}_category_id`];
    response[`${slot}Category`] = typeof categoryId === "number" ? categoryById.get(categoryId) ?? null : null;

    // Proteins are a free list, not two fixed options.
    response[`${slot}Options`] = slot === "protein"
      ? proteinIds.map(toOption).filter(Boolean)
      : [toOption(menu[`${slot}_option_1_id`]), toOption(menu[`${slot}_option_2_id`])].filter(Boolean);
  }

  return response;
}

/** Maps the client payload to daily_menus columns. Only the keys present are touched. */
export function toDailyMenuColumns(input: Record<string, any>): Record<string, unknown> {
  const columns: Record<string, unknown> = {};

  if (input.basePrice !== undefined) columns.base_price = input.basePrice;
  if (input.packagingFee !== undefined) columns.packaging_fee = input.packagingFee;
  if (input.isActive !== undefined) columns.isActive = input.isActive;

  for (const slot of DAILY_MENU_SLOTS) {
    const categoryKey = `${slot}CategoryId`;
    if (input[categoryKey] !== undefined) columns[`${slot}_category_id`] = input[categoryKey] ?? null;

    const options = input[`${slot}Options`];
    if (options !== undefined) {
      columns[`${slot}_option_1_id`] = options?.option1Id ?? null;
      columns[`${slot}_option_2_id`] = options?.option2Id ?? null;
    }
  }

  if (input.allProteinIds !== undefined) columns.protein_ids = input.allProteinIds || [];

  return columns;
}
