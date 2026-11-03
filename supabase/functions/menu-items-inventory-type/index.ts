import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUserFromRequest, canAccessRestaurant, cors, json, error, deepToCamelCase } from "../_shared/auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const INVENTORY_TYPES = ["TRACKED", "UNTRACKED"];

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

/** Turns inventory tracking on or off for one item. */
Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return cors(new Response(null, { status: 204 }), req);
  if (req.method !== "PATCH") return cors(error("Method not allowed", 405), req);

  const user = await getUserFromRequest(req);
  if (!user) return cors(error("Unauthorized", 401), req);

  try {
    const url = new URL(req.url);
    const input = await req.json();

    const itemId = parseInt(String(url.searchParams.get("id") ?? input.id ?? ""));
    if (!Number.isInteger(itemId)) return cors(error("Invalid item ID", 400), req);

    const inventoryType = String(input.inventoryType || "").toUpperCase();
    if (!INVENTORY_TYPES.includes(inventoryType)) {
      return cors(error(`inventoryType must be one of: ${INVENTORY_TYPES.join(", ")}`, 400), req);
    }

    const supabase = getSupabase();

    const { data: existing } = await supabase
      .from("menu_items")
      .select("id, restaurant_id, stock_quantity")
      .eq("id", itemId)
      .eq("deleted", false)
      .maybeSingle();

    if (!existing || !canAccessRestaurant(user, existing.restaurant_id)) {
      return cors(error("Menu item not found", 404, "ITEM_NOT_FOUND"), req);
    }

    const updateData: Record<string, unknown> = {
      inventory_type: inventoryType,
      updated_at: new Date().toISOString(),
    };

    if (input.lowStockAlert !== undefined) {
      const alert = Number(input.lowStockAlert);
      if (!Number.isInteger(alert) || alert < 0) {
        return cors(error("lowStockAlert must be zero or a positive integer", 400), req);
      }
      updateData.low_stock_alert = alert;
    }

    if (input.autoMarkUnavailable !== undefined) {
      updateData.auto_mark_unavailable = !!input.autoMarkUnavailable;
    }

    if (inventoryType === "TRACKED") {
      // Starting to track needs a number to start from.
      const initial = input.stockQuantity !== undefined
        ? Number(input.stockQuantity)
        : (existing.stock_quantity ?? 0);
      if (!Number.isInteger(initial) || initial < 0) {
        return cors(error("stockQuantity must be zero or a positive integer", 400), req);
      }
      updateData.stock_quantity = initial;
    } else {
      // Untracked items carry no stock, and are available until said otherwise.
      updateData.stock_quantity = null;
      updateData.is_available = true;
    }

    const { data: item, error: updateError } = await supabase
      .from("menu_items")
      .update(updateData)
      .eq("id", itemId)
      .select(`
        id, name, price, is_available, inventory_type, stock_quantity,
        low_stock_alert, auto_mark_unavailable, category_id, restaurant_id, updated_at
      `)
      .single();

    if (updateError) {
      console.error("Update error:", JSON.stringify(updateError));
      return cors(error("Failed to update inventory type", 500), req);
    }

    return cors(json({
      success: true,
      message: "Inventory type updated successfully",
      data: deepToCamelCase(item),
    }), req);

  } catch (e) {
    console.error("INVENTORY TYPE ERROR:", e);
    return cors(error("Internal server error", 500), req);
  }
});
