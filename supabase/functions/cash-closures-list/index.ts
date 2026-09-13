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

    const supabase = getSupabase();

    let query = supabase
      .from("cash_closures")
      .select(`
        id, opened_by_id, closed_by_id, opening_date, closing_date,
        opening_balance, expected_balance, actual_balance, difference,
        total_cash, total_nequi, total_expenses, total_vouchers,
        total_delivery, delivery_cash, delivery_nequi, status,
        created_at, restaurant_id,
        opened_by:users!cash_closures_opened_by_id_fkey(id, first_name, last_name),
        closed_by:users!cash_closures_closed_by_id_fkey(id, first_name, last_name)
      `)
      .eq("deleted", false)
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (user.restaurantId) {
      query = query.eq("restaurant_id", user.restaurantId);
    }

    if (status) {
      query = query.eq("status", status);
    }

    const { data: closures, error: queryError } = await query;

    if (queryError) {
      console.error("Query error:", queryError);
      return cors(error("Failed to fetch cash closures", 500));
    }

    // Get total count
    let countQuery = supabase
      .from("cash_closures")
      .select("id", { count: "exact", head: true })
      .eq("deleted", false);

    if (user.restaurantId) countQuery = countQuery.eq("restaurant_id", user.restaurantId);
    if (status) countQuery = countQuery.eq("status", status);

    const { count: total } = await countQuery;

    return cors(json({
      success: true,
      message: "Cash closures fetched successfully",
      data: closures || [],
      meta: {
        page,
        limit,
        total: total || 0,
        totalPages: Math.ceil((total || 0) / limit),
      },
    }));

  } catch (e) {
    console.error("CASH CLOSURES LIST ERROR:", e);
    return cors(error("Internal server error", 500));
  }
});
