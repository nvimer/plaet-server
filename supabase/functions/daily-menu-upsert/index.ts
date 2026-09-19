import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUserFromRequest, writeRestaurantId, cors, json, error } from "../_shared/auth.ts";
import { getRestaurantTimeZone, localDay } from "../_shared/time.ts";
import { DAILY_MENU_COLUMNS, DAILY_MENU_SLOTS, toDailyMenuColumns, toDailyMenuResponse } from "../_shared/daily-menu.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return cors(new Response(null, { status: 204 }), req);
  if (req.method !== "POST" && req.method !== "PATCH") return cors(error("Method not allowed", 405), req);

  const user = await getUserFromRequest(req);
  if (!user) return cors(error("Unauthorized", 401), req);

  try {
    const url = new URL(req.url);
    const dateParam = url.searchParams.get("date");

    if (dateParam && dateParam !== "today" && !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      return cors(error("Date must be YYYY-MM-DD", 400), req);
    }

    const input = await req.json();

    const restaurantId = writeRestaurantId(user, input.restaurantId);
    if (!restaurantId) return cors(error("Restaurant context required", 400, "TENANT_REQUIRED"), req);

    const supabase = getSupabase();
    const timeZone = await getRestaurantTimeZone(supabase, restaurantId);
    const day = !dateParam || dateParam === "today"
      ? localDay(input.createdAt ? new Date(input.createdAt) : new Date(), timeZone)
      : dateParam;

    const columns = toDailyMenuColumns(input);

    // Every referenced category and item must belong to this restaurant.
    const categoryIds = DAILY_MENU_SLOTS
      .map(s => columns[`${s}_category_id`])
      .filter((id): id is number => typeof id === "number");

    const itemIds = [
      ...DAILY_MENU_SLOTS.flatMap(s => [columns[`${s}_option_1_id`], columns[`${s}_option_2_id`]]),
      ...((columns.protein_ids as number[] | undefined) || []),
    ].filter((id): id is number => typeof id === "number");

    if (categoryIds.length) {
      const { count } = await supabase
        .from("menu_categories")
        .select("id", { count: "exact", head: true })
        .in("id", [...new Set(categoryIds)])
        .eq("restaurant_id", restaurantId)
        .eq("deleted", false);

      if ((count || 0) !== new Set(categoryIds).size) {
        return cors(error("One or more categories do not belong to this restaurant", 400, "CATEGORY_NOT_FOUND"), req);
      }
    }

    if (itemIds.length) {
      const { count } = await supabase
        .from("menu_items")
        .select("id", { count: "exact", head: true })
        .in("id", [...new Set(itemIds)])
        .eq("restaurant_id", restaurantId)
        .eq("deleted", false);

      if ((count || 0) !== new Set(itemIds).size) {
        return cors(error("One or more menu items do not belong to this restaurant", 400, "ITEMS_NOT_FOUND"), req);
      }
    }

    const { data: existing } = await supabase
      .from("daily_menus")
      .select("id")
      .eq("created_at", day)
      .eq("restaurant_id", restaurantId)
      .eq("deleted", false)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const now = new Date().toISOString();
    let menuId: string;

    if (existing) {
      const { error: updateError } = await supabase
        .from("daily_menus")
        .update({ ...columns, updated_at: now })
        .eq("id", existing.id);

      if (updateError) {
        console.error("Update error:", JSON.stringify(updateError));
        return cors(error("Failed to update daily menu", 500), req);
      }
      menuId = existing.id;

    } else {
      const { data: created, error: createError } = await supabase
        .from("daily_menus")
        .insert({
          ...columns,
          created_at: day,
          updated_at: now,
          isActive: true,
          restaurant_id: restaurantId,
        })
        .select("id")
        .single();

      if (createError || !created) {
        console.error("Create error:", JSON.stringify(createError));
        return cors(error("Failed to create daily menu", 500), req);
      }
      menuId = created.id;
    }

    const { data: menu } = await supabase
      .from("daily_menus")
      .select(DAILY_MENU_COLUMNS)
      .eq("id", menuId)
      .single();

    return cors(json({
      success: true,
      message: existing ? "Daily menu updated successfully" : "Daily menu created successfully",
      data: await toDailyMenuResponse(supabase, menu),
    }, existing ? 200 : 201), req);

  } catch (e) {
    console.error("DAILY MENU UPSERT ERROR:", e);
    return cors(error("Internal server error", 500), req);
  }
});
