import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUserFromRequest, cors, json, error, deepToCamelCase } from "../_shared/auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return cors(new Response(null, { status: 204 }), req);
  if (req.method !== "GET") return cors(error("Method not allowed", 405), req);

  const user = await getUserFromRequest(req);
  if (!user) return cors(error("Unauthorized", 401), req);

  try {
    const url = new URL(req.url);
    const categoryId = url.searchParams.get("id");

    if (!categoryId || isNaN(parseInt(categoryId))) {
      return cors(error("Invalid category ID", 400), req);
    }

    const supabase = getSupabase();

    const { data: category, error: queryError } = await supabase
      .from("menu_categories")
      .select(`
        id, name, description, "order", restaurant_id,
        items:menu_items(
          id, name, description, price, is_available, image_url,
          inventory_type, stock_quantity, category_id
        )
      `)
      .eq("id", parseInt(categoryId))
      .eq("deleted", false)
      .single();

    if (queryError || !category) {
      return cors(error("Category not found", 404, "CATEGORY_NOT_FOUND"), req);
    }

    if (user.restaurantId && category.restaurant_id !== user.restaurantId) {
      return cors(error("Forbidden", 403), req);
    }

    // Filter out deleted items
    const activeItems = (category.items || []).filter(
      (item: { is_available: boolean }) => item.is_available
    );

    return cors(json({
      success: true,
      message: "Category fetched successfully",
      data: deepToCamelCase({ ...category, items: activeItems }),
    }), req);

  } catch (e) {
    console.error("CATEGORY GET ERROR:", e);
    return cors(error("Internal server error", 500), req);
  }
});
