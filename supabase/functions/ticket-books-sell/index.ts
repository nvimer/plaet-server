import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUserFromRequest, writeRestaurantId, cors, json, error, deepToCamelCase } from "../_shared/auth.ts";
import { getRestaurantTimeZone, localDayRange } from "../_shared/time.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DEFAULT_EXPIRY_DAYS = 30;

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

    if (!input.customerId) return cors(error("Customer ID is required", 400), req);

    const totalPortions = Number(input.totalPortions);
    const purchasePrice = Number(input.purchasePrice);
    const expiryDays = Number(input.expiryDays ?? DEFAULT_EXPIRY_DAYS);

    if (!Number.isInteger(totalPortions) || totalPortions <= 0) {
      return cors(error("Total portions must be a positive integer", 400), req);
    }
    if (!Number.isFinite(purchasePrice) || purchasePrice < 0) {
      return cors(error("Purchase price must be a non-negative number", 400), req);
    }
    if (!Number.isInteger(expiryDays) || expiryDays <= 0) {
      return cors(error("Expiry days must be a positive integer", 400), req);
    }

    const restaurantId = writeRestaurantId(user, input.restaurantId);
    if (!restaurantId) return cors(error("Restaurant context required", 400, "TENANT_REQUIRED"), req);

    const supabase = getSupabase();
    const timeZone = await getRestaurantTimeZone(supabase, restaurantId);
    const day = localDayRange(new Date(), timeZone);

    const { data: bookId, error: txError } = await supabase.rpc("sell_ticket_book_tx", {
      p_restaurant_id: restaurantId,
      p_customer_id: input.customerId,
      p_total_portions: totalPortions,
      p_purchase_price: purchasePrice,
      p_expiry_days: expiryDays,
      p_day_start: day.start,
      p_day_end: day.end,
    });

    if (txError) {
      const message = String(txError.message || "");
      const code = message.split(":")[0].trim();
      const known: Record<string, number> = {
        CASH_CLOSURE_REQUIRED: 400,
        DAILY_TICKET_LIMIT_EXCEEDED: 400,
        INVALID_PORTIONS: 400,
        CUSTOMER_NOT_FOUND: 404,
      };
      if (known[code]) {
        return cors(error(message.slice(code.length + 1).trim() || code, known[code], code), req);
      }
      console.error("SELL TICKET BOOK TX ERROR:", JSON.stringify(txError));
      return cors(error("Failed to sell ticket book", 500), req);
    }

    const { data: book } = await supabase
      .from("ticket_books")
      .select(`
        id, "customerId", purchase_date, expiry_date, total_portions,
        consumed_portions, purchase_price, status, restaurant_id, created_at,
        customer:customers(id, first_name, last_name, phone)
      `)
      .eq("id", bookId)
      .single();

    return cors(json({
      success: true,
      message: "Ticket book sold successfully",
      data: deepToCamelCase({
        ...book,
        remaining_portions: Number(book?.total_portions || 0) - Number(book?.consumed_portions || 0),
      }),
    }, 201), req);

  } catch (e) {
    console.error("TICKET BOOK SELL ERROR:", e);
    return cors(error("Internal server error", 500), req);
  }
});
