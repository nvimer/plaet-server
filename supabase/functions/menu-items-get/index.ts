import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUserFromRequest, cors, json, error } from "../_shared/auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return cors(new Response(null, { status: 204 }));
  if (req.method !== "GET") return cors(error("Method not allowed", 405));

  const user = getUserFromRequest(req);
  if (!user) return cors(error("Unauthorized", 401));

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const itemId = pathParts[pathParts.length - 1];

    if (!itemId || isNaN(parseInt(itemId))) {
      return cors(error("Invalid item ID", 400));
    }

    const supabase = getSupabase();

    const { data: item, error: queryError } = await supabase
      .from("menu_items")
      .select(`
        id, name, description, price, is_available, image_url,
        inventory_type, stock_quantity, low_stock_alert, auto_mark_unavailable,
        created_at, updated_at, restaurant_id, category_id,
        category:menu_categories(id, name, description, "order")
      `)
      .eq("id", parseInt(itemId))
      .eq("deleted", false)
      .single();

    if (queryError || !item) {
      return cors(error("Menu item not found", 404, "ITEM_NOT_FOUND"));
    }

    if (user.restaurantId && item.restaurant_id !== user.restaurantId) {
      return cors(error("Forbidden", 403));
    }

    return cors(json({
      success: true,
      message: "Menu item fetched successfully",
      data: item,
    }));

  } catch (e) {
    console.error("MENU ITEM GET ERROR:", e);
    return cors(error("Internal server error", 500));
  }
});
