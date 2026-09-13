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
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "50")));
    const search = url.searchParams.get("search");

    const supabase = getSupabase();

    let query = supabase
      .from("menu_categories")
      .select(`
        id, name, description, "order", restaurant_id,
        items:menu_items(id, name, price, is_available)
      `)
      .eq("deleted", false)
      .order("order", { ascending: true })
      .range((page - 1) * limit, page * limit - 1);

    if (user.restaurantId) {
      query = query.eq("restaurant_id", user.restaurantId);
    }

    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    const { data: categories, error: queryError } = await query;

    if (queryError) {
      console.error("Query error:", queryError);
      return cors(error("Failed to fetch categories", 500));
    }

    // Get total count
    let countQuery = supabase
      .from("menu_categories")
      .select("id", { count: "exact", head: true })
      .eq("deleted", false);

    if (user.restaurantId) countQuery = countQuery.eq("restaurant_id", user.restaurantId);
    if (search) countQuery = countQuery.ilike("name", `%${search}%`);

    const { count: total } = await countQuery;

    // Filter out deleted items from the items array
    const categoriesWithActiveItems = (categories || []).map(cat => ({
      ...cat,
      items: (cat.items || []).filter((item: { is_available: boolean }) => item.is_available),
    }));

    return cors(json({
      success: true,
      message: "Categories fetched successfully",
      data: categoriesWithActiveItems,
      meta: {
        page,
        limit,
        total: total || 0,
        totalPages: Math.ceil((total || 0) / limit),
      },
    }));

  } catch (e) {
    console.error("CATEGORIES LIST ERROR:", e);
    return cors(error("Internal server error", 500));
  }
});
