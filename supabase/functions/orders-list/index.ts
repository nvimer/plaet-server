import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getRestaurantTimeZone, localDayRange } from "../_shared/time.ts";
import { getUserFromRequest, tenantScope, cors, json, error, deepToCamelCase } from "../_shared/auth.ts";

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
  const scope = tenantScope(user);
  if (scope === false) return cors(error("Restaurant context required", 403, "TENANT_REQUIRED"), req);

  try {
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20")));
    const status = url.searchParams.get("status");
    const type = url.searchParams.get("type");
    const waiterId = url.searchParams.get("waiterId");
    const tableId = url.searchParams.get("tableId");
    const date = url.searchParams.get("date");

    const supabase = getSupabase();

    let query = supabase
      .from("orders")
      .select(`
        id, waiter_id, table_id, "customerId", status, type, total_amount,
        notes, whatsapp_order_id, created_at, updated_at, restaurant_id,
        items:order_items(
          id, menu_item_id, quantity, price_at_order, notes, status, created_at,
          is_substitution, replaces_category_type, original_item_id, is_extra,
          menu_item:menu_items(id, name, price, category_id)
        ),
        table:tables(id, number, status),
        customer:customers(id, first_name, last_name, phone),
        payments(id, amount, method, created_at)
      `)
      .eq("deleted", false)
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (scope) query = query.eq("restaurant_id", scope);

    if (status) query = query.eq("status", status);
    if (type) query = query.eq("type", type);
    if (waiterId) query = query.eq("waiter_id", waiterId);
    if (tableId) query = query.eq("table_id", parseInt(tableId));

    const dayRange = date ? localDayRange(date, await getRestaurantTimeZone(supabase, scope)) : null;
    if (dayRange) query = query.gte("created_at", dayRange.start).lte("created_at", dayRange.end);

    const { data: orders, error: queryError, count } = await query;

    if (queryError) {
      console.error("Query error:", queryError);
      return cors(error("Failed to fetch orders", 500), req);
    }

    // Get total count for pagination
    let countQuery = supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("deleted", false);

    if (scope) countQuery = countQuery.eq("restaurant_id", scope);
    if (status) countQuery = countQuery.eq("status", status);
    if (type) countQuery = countQuery.eq("type", type);
    if (waiterId) countQuery = countQuery.eq("waiter_id", waiterId);
    if (tableId) countQuery = countQuery.eq("table_id", parseInt(tableId));
    if (dayRange) countQuery = countQuery.gte("created_at", dayRange.start).lte("created_at", dayRange.end);

    const { count: total } = await countQuery;

    return cors(json({
      success: true,
      message: "Orders fetched successfully",
      data: deepToCamelCase(orders || []),
      meta: {
        page,
        limit,
        total: total || 0,
        totalPages: Math.ceil((total || 0) / limit),
      },
    }), req);

  } catch (e) {
    console.error("ORDERS LIST ERROR:", e);
    return cors(error("Internal server error", 500), req);
  }
});
