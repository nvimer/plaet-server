import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUserFromRequest, tenantScope, cors, json, error, deepToCamelCase } from "../_shared/auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

/** Adds or removes stock. `action` decides the sign; the quantity is always positive. */
Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return cors(new Response(null, { status: 204 }), req);
  if (req.method !== "POST" && req.method !== "PATCH") return cors(error("Method not allowed", 405), req);

  const user = await getUserFromRequest(req);
  if (!user) return cors(error("Unauthorized", 401), req);

  const scope = tenantScope(user);
  if (scope === false) return cors(error("Restaurant context required", 403, "TENANT_REQUIRED"), req);

  try {
    const url = new URL(req.url);
    const input = await req.json();

    const itemId = parseInt(String(url.searchParams.get("id") ?? input.id ?? ""));
    if (!Number.isInteger(itemId)) return cors(error("Invalid item ID", 400), req);

    const action = String(url.searchParams.get("action") ?? input.action ?? "add").toLowerCase();
    if (action !== "add" && action !== "remove") {
      return cors(error("Action must be add or remove", 400), req);
    }

    const quantity = Number(input.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return cors(error("Quantity must be a positive integer", 400), req);
    }

    const supabase = getSupabase();

    // A global SUPERADMIN has no tenant of their own: take the item's.
    let restaurantId = scope;
    if (!restaurantId) {
      const { data: item } = await supabase
        .from("menu_items").select("restaurant_id").eq("id", itemId).eq("deleted", false).maybeSingle();
      if (!item) return cors(error("Menu item not found", 404, "ITEM_NOT_FOUND"), req);
      restaurantId = item.restaurant_id;
    }

    const { data: newStock, error: txError } = await supabase.rpc("adjust_stock_tx", {
      p_menu_item_id: itemId,
      p_restaurant_id: restaurantId,
      p_delta: action === "add" ? quantity : -quantity,
      p_reason: input.reason || (action === "add" ? "Manual add" : "Manual remove"),
      p_user_id: user.id,
    });

    if (txError) {
      const message = String(txError.message || "");
      const code = message.split(":")[0].trim();
      const known: Record<string, number> = {
        ITEM_NOT_FOUND: 404,
        NOT_TRACKED: 400,
        INSUFFICIENT_STOCK: 400,
        INVALID_QUANTITY: 400,
      };
      if (known[code]) {
        return cors(error(message.slice(code.length + 1).trim() || code, known[code], code), req);
      }
      console.error("ADJUST STOCK TX ERROR:", JSON.stringify(txError));
      return cors(error("Failed to adjust stock", 500), req);
    }

    const { data: item } = await supabase
      .from("menu_items")
      .select(`
        id, name, price, is_available, inventory_type, stock_quantity,
        low_stock_alert, auto_mark_unavailable, category_id, restaurant_id, updated_at
      `)
      .eq("id", itemId)
      .single();

    return cors(json({
      success: true,
      message: action === "add" ? "Stock added successfully" : "Stock removed successfully",
      data: deepToCamelCase({ ...item, stock_quantity: newStock }),
    }), req);

  } catch (e) {
    console.error("STOCK ADJUST ERROR:", e);
    return cors(error("Internal server error", 500), req);
  }
});
