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
    const closureId = pathParts[pathParts.length - 1];

    if (!closureId) {
      return cors(error("Invalid closure ID", 400));
    }

    const supabase = getSupabase();

    const { data: closure, error: queryError } = await supabase
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
      .eq("id", closureId)
      .eq("deleted", false)
      .single();

    if (queryError || !closure) {
      return cors(error("Cash closure not found", 404, "CLOSURE_NOT_FOUND"));
    }

    if (user.restaurantId && closure.restaurant_id !== user.restaurantId) {
      return cors(error("Forbidden", 403));
    }

    // Get orders summary for this closure
    const { data: orders } = await supabase
      .from("orders")
      .select("id, status, total_amount, type")
      .eq("cash_closure_id", closureId)
      .eq("deleted", false);

    const ordersSummary = {
      totalOrders: orders?.length || 0,
      paidOrders: orders?.filter(o => o.status === "PAID").length || 0,
      totalRevenue: orders?.reduce((sum, o) => sum + Number(o.total_amount), 0) || 0,
    };

    // Get expenses for this closure
    const { data: expenses } = await supabase
      .from("expenses")
      .select("id, amount, description")
      .eq("cash_closure_id", closureId)
      .eq("deleted", false);

    const expensesSummary = {
      totalExpenses: expenses?.length || 0,
      totalAmount: expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0,
    };

    return cors(json({
      success: true,
      message: "Cash closure fetched successfully",
      data: {
        ...closure,
        ordersSummary,
        expensesSummary,
      },
    }));

  } catch (e) {
    console.error("CASH CLOSURE GET ERROR:", e);
    return cors(error("Internal server error", 500));
  }
});
