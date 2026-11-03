import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUserFromRequest, tenantScope, cors, json, error, deepToCamelCase } from "../_shared/auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

/** Movements of one item (?itemId=) or of the whole restaurant. */
Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return cors(new Response(null, { status: 204 }), req);
  if (req.method !== "GET") return cors(error("Method not allowed", 405), req);

  const user = await getUserFromRequest(req);
  if (!user) return cors(error("Unauthorized", 401), req);

  const scope = tenantScope(user);
  if (scope === false) return cors(error("Restaurant context required", 403, "TENANT_REQUIRED"), req);

  try {
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20")));
    const itemId = url.searchParams.get("itemId");
    const type = url.searchParams.get("type");

    const supabase = getSupabase();

    let query = supabase
      .from("stock_adjustments")
      .select(`
        id, menu_item_id, previous_stock, new_stock, quantity, reason,
        adjustment_type, order_id, created_at, restaurant_id,
        menu_item:menu_items(id, name, category_id),
        user:users(id, first_name, last_name)
      `)
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    let countQuery = supabase.from("stock_adjustments").select("id", { count: "exact", head: true });

    if (scope) {
      query = query.eq("restaurant_id", scope);
      countQuery = countQuery.eq("restaurant_id", scope);
    }
    if (itemId) {
      query = query.eq("menu_item_id", parseInt(itemId));
      countQuery = countQuery.eq("menu_item_id", parseInt(itemId));
    }
    if (type) {
      query = query.eq("adjustment_type", type);
      countQuery = countQuery.eq("adjustment_type", type);
    }

    const { data: movements, error: queryError } = await query;

    if (queryError) {
      console.error("Query error:", JSON.stringify(queryError));
      return cors(error("Failed to fetch stock history", 500), req);
    }

    const { count: total } = await countQuery;

    return cors(json({
      success: true,
      message: "Stock history fetched successfully",
      data: deepToCamelCase(movements || []),
      meta: {
        page,
        limit,
        total: total || 0,
        totalPages: Math.ceil((total || 0) / limit),
      },
    }), req);

  } catch (e) {
    console.error("STOCK HISTORY ERROR:", e);
    return cors(error("Internal server error", 500), req);
  }
});
