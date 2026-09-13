import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUserFromRequest, cors, json, error } from "../_shared/auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

const VALID_ITEM_STATUSES = ["PENDING", "IN_PROGRESS", "READY", "DELIVERED", "CANCELLED"];

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return cors(new Response(null, { status: 204 }));
  if (req.method !== "PATCH") return cors(error("Method not allowed", 405));

  const user = getUserFromRequest(req);
  if (!user) return cors(error("Unauthorized", 401));

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");

    // /orders/:id/items/:itemId/status
    const orderId = pathParts[pathParts.length - 3];
    const itemId = pathParts[pathParts.length - 2];

    if (!orderId || !itemId) return cors(error("Order ID and Item ID required", 400));

    const { status: newStatus } = await req.json();

    if (!newStatus) return cors(error("Status is required", 400));
    if (!VALID_ITEM_STATUSES.includes(newStatus)) {
      return cors(error(`Invalid status. Must be one of: ${VALID_ITEM_STATUSES.join(", ")}`, 400));
    }

    const supabase = getSupabase();

    // Verify order exists
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, restaurant_id")
      .eq("id", orderId)
      .eq("deleted", false)
      .single();

    if (orderError || !order) {
      return cors(error("Order not found", 404, "ORDER_NOT_FOUND"));
    }

    if (user.restaurantId && order.restaurant_id !== user.restaurantId) {
      return cors(error("Forbidden", 403));
    }

    // Update item status
    const { data: updatedItem, error: updateError } = await supabase
      .from("order_items")
      .update({ status: newStatus })
      .eq("id", parseInt(itemId))
      .eq("order_id", orderId)
      .select("*")
      .single();

    if (updateError || !updatedItem) {
      console.error("Update item error:", updateError);
      return cors(error("Item not found or update failed", 404, "ITEM_NOT_FOUND"));
    }

    return cors(json({
      success: true,
      message: "Item status updated successfully",
      data: updatedItem,
    }));

  } catch (e) {
    console.error("ORDER ITEM STATUS UPDATE ERROR:", e);
    return cors(error("Internal server error", 500));
  }
});
