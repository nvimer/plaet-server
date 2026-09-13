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
          menu_item:menu_items(id, name, price, category_id)
        ),
        table:tables(id, number, status),
        customer:customers(id, first_name, last_name, phone),
        payments(id, amount, method, created_at)
      `)
      .eq("deleted", false)
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (user.restaurantId) {
      query = query.eq("restaurant_id", user.restaurantId);
    }

    if (status) query = query.eq("status", status);
    if (type) query = query.eq("type", type);
    if (waiterId) query = query.eq("waiter_id", waiterId);
    if (tableId) query = query.eq("table_id", parseInt(tableId));

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      query = query.gte("created_at", start.toISOString()).lte("created_at", end.toISOString());
    }

    const { data: orders, error: queryError, count } = await query;

    if (queryError) {
      console.error("Query error:", queryError);
      return cors(error("Failed to fetch orders", 500));
    }

    // Get total count for pagination
    let countQuery = supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("deleted", false);

    if (user.restaurantId) countQuery = countQuery.eq("restaurant_id", user.restaurantId);
    if (status) countQuery = countQuery.eq("status", status);
    if (type) countQuery = countQuery.eq("type", type);
    if (waiterId) countQuery = countQuery.eq("waiter_id", waiterId);
    if (tableId) countQuery = countQuery.eq("table_id", parseInt(tableId));
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      countQuery = countQuery.gte("created_at", start.toISOString()).lte("created_at", end.toISOString());
    }

    const { count: total } = await countQuery;

    return cors(json({
      success: true,
      message: "Orders fetched successfully",
      data: orders || [],
      meta: {
        page,
        limit,
        total: total || 0,
        totalPages: Math.ceil((total || 0) / limit),
      },
    }));

  } catch (e) {
    console.error("ORDERS LIST ERROR:", e);
    return cors(error("Internal server error", 500));
  }
});
