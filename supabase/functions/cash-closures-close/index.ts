import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUserFromRequest, writeRestaurantId, cors, json, error, deepToCamelCase } from "../_shared/auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return cors(new Response(null, { status: 204 }), req);
  if (req.method !== "POST") return cors(error("Method not allowed", 405), req);

  const user = await getUserFromRequest(req);
  if (!user) return cors(error("Unauthorized", 401), req);

  try {
    const input = await req.json();

    if (input.actualBalance === undefined || input.actualBalance < 0) {
      return cors(error("Actual balance is required and must be non-negative", 400), req);
    }

    const restaurantId = writeRestaurantId(user, input.restaurantId);
    if (!restaurantId) return cors(error("Restaurant context required", 400, "TENANT_REQUIRED"), req);

    const supabase = getSupabase();

    // One transaction: locks the open register, totals payments and expenses,
    // and closes it. Two cashiers closing at once can no longer both succeed.
    const { data: closureId, error: txError } = await supabase.rpc("close_cash_closure_tx", {
      p_restaurant_id: restaurantId,
      p_closed_by: user.id,
      p_actual_balance: input.actualBalance,
    });

    if (txError) {
      const message = String(txError.message || "");
      if (message.startsWith("NO_OPEN_CLOSURE")) {
        return cors(error("No open cash closure found", 404, "NO_OPEN_CLOSURE"), req);
      }
      console.error("CLOSE CLOSURE TX ERROR:", JSON.stringify(txError));
      return cors(error("Failed to close cash closure", 500), req);
    }

    const { data: closedClosure } = await supabase
      .from("cash_closures")
      .select(`
        id, opened_by_id, closed_by_id, opening_date, closing_date,
        opening_balance, expected_balance, actual_balance, difference,
        total_cash, total_nequi, total_expenses, total_vouchers,
        status, created_at, restaurant_id,
        opened_by:users!cash_closures_opened_by_id_fkey(id, first_name, last_name),
        closed_by:users!cash_closures_closed_by_id_fkey(id, first_name, last_name)
      `)
      .eq("id", closureId)
      .single();

    const { data: orders } = await supabase
      .from("orders")
      .select("total_amount")
      .eq("cash_closure_id", closureId)
      .eq("deleted", false);

    const totalRevenue = orders?.reduce((sum, o) => sum + Number(o.total_amount), 0) || 0;

    return cors(json({
      success: true,
      message: "Cash closure closed successfully",
      data: deepToCamelCase({
        ...closedClosure,
        summary: {
          totalRevenue,
          totalCash: Number(closedClosure?.total_cash || 0),
          totalNequi: Number(closedClosure?.total_nequi || 0),
          totalVouchers: Number(closedClosure?.total_vouchers || 0),
          totalExpenses: Number(closedClosure?.total_expenses || 0),
        },
      }),
    }), req);

  } catch (e) {
    console.error("CASH CLOSURE CLOSE ERROR:", e);
    return cors(error("Internal server error", 500), req);
  }
});
