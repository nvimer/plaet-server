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

    if (!input.orderId || !input.amount || input.amount <= 0) {
      return cors(error("Order ID and positive amount are required", 400));
    }

    const validMethods = ["CASH", "NEQUI", "VOUCHER", "CARD", "TRANSFER"];
    if (!validMethods.includes(input.method || "CASH")) {
      return cors(error(`Invalid payment method. Must be one of: ${validMethods.join(", ")}`, 400));
    }

    const supabase = getSupabase();

    // Verify order exists
    const { data: order } = await supabase
      .from("orders")
      .select("id, total_amount, cash_closure_id")
      .eq("id", input.orderId)
      .eq("deleted", false)
      .single();

    if (!order) {
      return cors(error("Order not found", 404, "ORDER_NOT_FOUND"));
    }

    const { data: newPayment, error: createError } = await supabase
      .from("payments")
      .insert({
        order_id: input.orderId,
        method: input.method || "CASH",
        amount: input.amount,
        transaction_ref: input.transactionRef || null,
        daily_ticket_book_code_id: input.ticketBookCodeId || null,
        cash_closure_id: input.cashClosureId || order.cash_closure_id,
      })
      .select(`
        id, order_id, method, amount, transaction_ref, cash_closure_id, created_at,
        order:orders(id, status, total_amount)
      `)
      .single();

    if (createError) {
      console.error("Create error:", createError);
      return cors(error("Failed to create payment", 500));
    }

    return cors(json({
      success: true,
      message: "Payment created successfully",
      data: newPayment,
    }), 201);

  } catch (e) {
    console.error("PAYMENT CREATE ERROR:", e);
    return cors(error("Internal server error", 500));
  }
});
