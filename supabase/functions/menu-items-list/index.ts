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
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20")));
    const categoryId = url.searchParams.get("categoryId");
    const isAvailable = url.searchParams.get("isAvailable");
    const search = url.searchParams.get("search");

    const supabase = getSupabase();

    let query = supabase
      .from("menu_items")
      .select(`
        id, name, description, price, is_available, image_url,
        inventory_type, stock_quantity, low_stock_alert, auto_mark_unavailable,
        created_at, updated_at, restaurant_id, category_id,
        category:menu_categories(id, name, description, "order")
      `)
      .eq("deleted", false)
      .order("name", { ascending: true })
      .range((page - 1) * limit, page * limit - 1);

    if (user.restaurantId) {
      query = query.eq("restaurant_id", user.restaurantId);
    }

    if (categoryId) query = query.eq("category_id", parseInt(categoryId));
    if (isAvailable !== null && isAvailable !== undefined) {
      query = query.eq("is_available", isAvailable === "true");
    }
    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    const { data: items, error: queryError } = await query;

    if (queryError) {
      console.error("Query error:", queryError);
      return cors(error("Failed to fetch menu items", 500));
    }

    // Get total count
    let countQuery = supabase
      .from("menu_items")
      .select("id", { count: "exact", head: true })
      .eq("deleted", false);

    if (user.restaurantId) countQuery = countQuery.eq("restaurant_id", user.restaurantId);
    if (categoryId) countQuery = countQuery.eq("category_id", parseInt(categoryId));
    if (isAvailable !== null && isAvailable !== undefined) {
      countQuery = countQuery.eq("is_available", isAvailable === "true");
    }
    if (search) countQuery = countQuery.ilike("name", `%${search}%`);

    const { count: total } = await countQuery;

    return cors(json({
      success: true,
      message: "Menu items fetched successfully",
      data: items || [],
      meta: {
        page,
        limit,
        total: total || 0,
        totalPages: Math.ceil((total || 0) / limit),
      },
    }));

  } catch (e) {
    console.error("MENU ITEMS LIST ERROR:", e);
    return cors(error("Internal server error", 500));
  }
});
