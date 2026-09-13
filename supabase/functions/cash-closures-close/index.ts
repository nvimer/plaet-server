import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUserFromRequest, cors, json, error } from "../_shared/auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return cors(new Response(null, { status: 204 }));
  if (req.method !== "POST") return cors(error("Method not allowed", 405));

  const user = getUserFromRequest(req);
  if (!user) return cors(error("Unauthorized", 401));

  try {
    const input = await req.json();

    if (input.actualBalance === undefined || input.actualBalance < 0) {
      return cors(error("Actual balance is required and must be non-negative", 400));
    }

    const supabase = getSupabase();

    // Get the open closure
    const { data: openClosure } = await supabase
      .from("cash_closures")
      .select(`
        id, opening_balance, restaurant_id,
        opened_by:users!cash_closures_opened_by_id_fkey(id, first_name, last_name)
      `)
      .eq("status", "OPEN")
      .eq("deleted", false)
      .single();

    if (!openClosure) {
      return cors(error("No open cash closure found", 404, "NO_OPEN_CLOSURE"));
    }

    // Calculate totals from orders
    const { data: orders } = await supabase
      .from("orders")
      .select("id, total_amount, type")
      .eq("cash_closure_id", openClosure.id)
      .eq("deleted", false);

    const totalRevenue = orders?.reduce((sum, o) => sum + Number(o.total_amount), 0) || 0;

    // Calculate payment method totals
    const { data: payments } = await supabase
      .from("payments")
      .select("id, amount, method")
      .eq("cash_closure_id", openClosure.id);

    const totalCash = payments?.filter(p => p.method === "CASH").reduce((sum, p) => sum + Number(p.amount), 0) || 0;
    const totalNequi = payments?.filter(p => p.method === "NEQUI").reduce((sum, p) => sum + Number(p.amount), 0) || 0;
    const totalVouchers = payments?.filter(p => p.method === "VOUCHER").reduce((sum, p) => sum + Number(p.amount), 0) || 0;

    // Calculate expenses
    const { data: expenses } = await supabase
      .from("expenses")
      .select("id, amount")
      .eq("cash_closure_id", openClosure.id)
      .eq("deleted", false);

    const totalExpenses = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

    // Calculate expected balance
    const expectedBalance = Number(openClosure.opening_balance) + totalCash - totalExpenses;

    // Calculate difference
    const difference = input.actualBalance - expectedBalance;

    // Update closure
    const { data: closedClosure, error: closeError } = await supabase
      .from("cash_closures")
      .update({
        closed_by_id: user.id,
        closing_date: new Date().toISOString(),
        actual_balance: input.actualBalance,
        expected_balance: expectedBalance,
        difference: difference,
        total_cash: totalCash,
        total_nequi: totalNequi,
        total_expenses: totalExpenses,
        total_vouchers: totalVouchers,
        status: "CLOSED",
        updated_at: new Date().toISOString(),
      })
      .eq("id", openClosure.id)
      .select(`
        id, opened_by_id, closed_by_id, opening_date, closing_date,
        opening_balance, expected_balance, actual_balance, difference,
        total_cash, total_nequi, total_expenses, total_vouchers,
        status, created_at, restaurant_id,
        opened_by:users!cash_closures_opened_by_id_fkey(id, first_name, last_name),
        closed_by:users!cash_closures_closed_by_id_fkey(id, first_name, last_name)
      `)
      .single();

    if (closeError) {
      console.error("Close error:", closeError);
      return cors(error("Failed to close cash closure", 500));
    }

    return cors(json({
      success: true,
      message: "Cash closure closed successfully",
      data: {
        ...closedClosure,
        summary: {
          totalRevenue,
          totalCash,
          totalNequi,
          totalVouchers,
          totalExpenses,
        },
      },
    }));

  } catch (e) {
    console.error("CASH CLOSURE CLOSE ERROR:", e);
    return cors(error("Internal server error", 500));
  }
});
