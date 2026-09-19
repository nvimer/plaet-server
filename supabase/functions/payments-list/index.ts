import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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
    const orderId = url.searchParams.get("orderId");
    const cashClosureId = url.searchParams.get("cashClosureId");

    const supabase = getSupabase();

    let query = supabase
      .from("payments")
      .select(`
        id, order_id, method, amount, transaction_ref, cash_closure_id, created_at,
        order:orders!inner(id, status, total_amount, type, restaurant_id)
      `)
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (scope) query = query.eq("order.restaurant_id", scope);
    if (orderId) query = query.eq("order_id", orderId);
    if (cashClosureId) query = query.eq("cash_closure_id", cashClosureId);

    const { data: payments, error: queryError } = await query;

    if (queryError) {
      console.error("Query error:", queryError);
      return cors(error("Failed to fetch payments", 500), req);
    }

    // Get total count
    let countQuery = supabase
      .from("payments")
      .select("id, order:orders!inner(restaurant_id)", { count: "exact", head: true });

    if (scope) countQuery = countQuery.eq("order.restaurant_id", scope);
    if (orderId) countQuery = countQuery.eq("order_id", orderId);
    if (cashClosureId) countQuery = countQuery.eq("cash_closure_id", cashClosureId);

    const { count: total } = await countQuery;

    return cors(json({
      success: true,
      message: "Payments fetched successfully",
      data: deepToCamelCase(payments || []),
      meta: {
        page,
        limit,
        total: total || 0,
        totalPages: Math.ceil((total || 0) / limit),
      },
    }), req);

  } catch (e) {
    console.error("PAYMENTS LIST ERROR:", e);
    return cors(error("Internal server error", 500), req);
  }
});
