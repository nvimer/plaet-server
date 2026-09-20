import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUserFromRequest, writeRestaurantId, cors, json, error } from "../_shared/auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

/** The morning load: sets each tracked item to the portions cooked for the day. */
Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return cors(new Response(null, { status: 204 }), req);
  if (req.method !== "POST") return cors(error("Method not allowed", 405), req);

  const user = await getUserFromRequest(req);
  if (!user) return cors(error("Unauthorized", 401), req);

  try {
    const input = await req.json();

    if (!Array.isArray(input.items) || input.items.length === 0) {
      return cors(error("items must be a non-empty array", 400), req);
    }

    const items = input.items.map((i: { itemId?: number; item_id?: number; quantity?: number }) => ({
      item_id: Number(i.itemId ?? i.item_id),
      quantity: Number(i.quantity),
    }));

    if (items.some((i: { item_id: number; quantity: number }) => !Number.isInteger(i.item_id) || !Number.isInteger(i.quantity))) {
      return cors(error("Each item needs an integer itemId and quantity", 400), req);
    }

    const restaurantId = writeRestaurantId(user, input.restaurantId);
    if (!restaurantId) return cors(error("Restaurant context required", 400, "TENANT_REQUIRED"), req);

    const supabase = getSupabase();

    const { data: count, error: txError } = await supabase.rpc("daily_stock_reset_tx", {
      p_payload: {
        restaurant_id: restaurantId,
        user_id: user.id,
        category_id: input.categoryId ?? null,
        items,
      },
    });

    if (txError) {
      const message = String(txError.message || "");
      const code = message.split(":")[0].trim();
      const known: Record<string, number> = {
        ITEM_NOT_FOUND: 404,
        CATEGORY_MISMATCH: 400,
        INVALID_QUANTITY: 400,
        NO_ITEMS: 400,
        TENANT_REQUIRED: 400,
      };
      if (known[code]) {
        return cors(error(message.slice(code.length + 1).trim() || code, known[code], code), req);
      }
      console.error("STOCK RESET TX ERROR:", JSON.stringify(txError));
      return cors(error("Failed to reset stock", 500), req);
    }

    return cors(json({
      success: true,
      message: `Stock reset for ${count} item(s)`,
      data: { updated: count },
    }), req);

  } catch (e) {
    console.error("STOCK RESET ERROR:", e);
    return cors(error("Internal server error", 500), req);
  }
});
