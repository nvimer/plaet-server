import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUserFromRequest, canAccessRestaurant, cors, json, error, deepToCamelCase } from "../_shared/auth.ts";
import { getRestaurantTimeZone, localDay } from "../_shared/time.ts";

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

    if (!input.orderId || !input.amount || input.amount <= 0) {
      return cors(error("Order ID and positive amount are required", 400), req);
    }

    // The PaymentMethod enum only has these three; the rest were rejected by Postgres.
    const validMethods = ["CASH", "NEQUI", "TICKET_BOOK"];
    if (!validMethods.includes(input.method || "CASH")) {
      return cors(error(`Invalid payment method. Must be one of: ${validMethods.join(", ")}`, 400), req);
    }

    const supabase = getSupabase();

    // Verify order exists
    const { data: order } = await supabase
      .from("orders")
      .select("id, total_amount, cash_closure_id, restaurant_id")
      .eq("id", input.orderId)
      .eq("deleted", false)
      .maybeSingle();

    if (!order || !canAccessRestaurant(user, order.restaurant_id)) {
      return cors(error("Order not found", 404, "ORDER_NOT_FOUND"), req);
    }

    let cashClosureId = order.cash_closure_id;
    if (input.cashClosureId && input.cashClosureId !== order.cash_closure_id) {
      const { data: closure } = await supabase
        .from("cash_closures")
        .select("id")
        .eq("id", input.cashClosureId)
        .eq("restaurant_id", order.restaurant_id)
        .eq("deleted", false)
        .maybeSingle();
      if (!closure) return cors(error("Cash closure not found", 404, "CLOSURE_NOT_FOUND"), req);
      cashClosureId = closure.id;
    }

    // A ticket book may be identified by the customer on the order or by phone.
    let customerId: string | null = input.customerId || null;
    if (!customerId && input.phone) {
      const phone = `"${String(input.phone).replace(/["\\]/g, "")}"`;
      const { data: customer } = await supabase
        .from("customers")
        .select("id")
        .eq("restaurant_id", order.restaurant_id)
        .eq("deleted", false)
        .or(`phone.eq.${phone},phone2.eq.${phone}`)
        .limit(1)
        .maybeSingle();
      if (!customer) return cors(error("Customer not found", 404, "CUSTOMER_NOT_FOUND"), req);
      customerId = customer.id;
    }

    const timeZone = await getRestaurantTimeZone(supabase, order.restaurant_id);

    const { data: paymentId, error: txError } = await supabase.rpc("register_payment_tx", {
      p_payload: {
        restaurant_id: order.restaurant_id,
        order_id: input.orderId,
        method: input.method || "CASH",
        amount: input.amount,
        transaction_ref: input.transactionRef || null,
        cash_closure_id: cashClosureId,
        customer_id: customerId,
        portion_count: input.portionCount ?? 1,
        local_date: localDay(new Date(), timeZone),
      },
    });

    if (txError) {
      const message = String(txError.message || "");
      const code = message.split(":")[0].trim();
      const known: Record<string, number> = {
        ORDER_NOT_FOUND: 404,
        ORDER_CANCELLED: 400,
        CUSTOMER_REQUIRED: 400,
        NO_ACTIVE_TICKET_BOOK: 400,
        INSUFFICIENT_PORTIONS: 400,
        INVALID_PORTIONS: 400,
        TICKET_ALREADY_REDEEMED_TODAY: 409,
        TICKET_EXCEEDS_BALANCE: 400,
      };
      if (known[code]) {
        return cors(error(message.slice(code.length + 1).trim() || code, known[code], code), req);
      }
      console.error("REGISTER PAYMENT TX ERROR:", JSON.stringify(txError));
      return cors(error("Failed to create payment", 500), req);
    }

    const { data: newPayment } = await supabase
      .from("payments")
      .select(`
        id, order_id, method, amount, transaction_ref, cash_closure_id, created_at,
        daily_ticket_book_code_id,
        order:orders(id, status, total_amount)
      `)
      .eq("id", paymentId)
      .single();

    return cors(json({
      success: true,
      message: "Payment created successfully",
      data: deepToCamelCase(newPayment),
    }, 201), req);

  } catch (e) {
    console.error("PAYMENT CREATE ERROR:", e);
    return cors(error("Internal server error", 500), req);
  }
});
