import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUserFromRequest, canAccessRestaurant, cors, json, error, deepToCamelCase } from "../_shared/auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

// Mirrors the OrderStatus enum. IN_KITCHEN, READY and DELIVERED belong to
// OrderItemStatus (orders-update-item-status), not to the order itself: asking
// for them here used to reach Postgres and fail on the enum.
const VALID_TRANSITIONS: Record<string, string[]> = {
  OPEN: ["SENT_TO_CASHIER", "PAID", "CANCELLED"],
  SENT_TO_CASHIER: ["PAID", "OPEN", "CANCELLED"],
  PAID: ["CANCELLED"],
  CANCELLED: [],
};

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return cors(new Response(null, { status: 204 }), req);
  if (req.method !== "PATCH") return cors(error("Method not allowed", 405), req);

  const user = await getUserFromRequest(req);
  if (!user) return cors(error("Unauthorized", 401), req);

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const orderId = pathParts[pathParts.length - 2]; // /orders/:id/status

    if (!orderId) return cors(error("Order ID required", 400), req);

    const { status: newStatus } = await req.json();

    if (!newStatus) return cors(error("Status is required", 400), req);

    const supabase = getSupabase();

    // Get current order
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("id, status, table_id, restaurant_id")
      .eq("id", orderId)
      .eq("deleted", false)
      .single();

    if (fetchError || !order) {
      return cors(error("Order not found", 404, "ORDER_NOT_FOUND"), req);
    }

    if (!canAccessRestaurant(user, order.restaurant_id)) {
      return cors(error("Forbidden", 403), req);
    }

    // Validate status transition
    const allowedTransitions = VALID_TRANSITIONS[order.status] || [];
    if (!allowedTransitions.includes(newStatus)) {
      return cors(error(`Cannot transition from ${order.status} to ${newStatus}`, 400, "INVALID_TRANSITION"), req);
    }

    // Update order status
    const { error: updateError } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId);

    if (updateError) {
      console.error("Update error:", updateError);
      return cors(error("Failed to update order status", 500), req);
    }

    // If cancelled, revert stock
    if (newStatus === "CANCELLED") {
      const { data: items } = await supabase
        .from("order_items")
        .select("menu_item_id, quantity")
        .eq("order_id", orderId)
        .not("menu_item_id", "is", null);

      if (items) {
        for (const item of items) {
          await supabase.rpc("revert_stock", {
            p_menu_item_id: item.menu_item_id,
            p_quantity: item.quantity,
            p_order_id: orderId,
          });
        }
      }

      // Free table if dine-in
      if (order.table_id) {
        await supabase.from("tables").update({ status: "AVAILABLE" }).eq("id", order.table_id);
      }
    }

    // Fetch updated order
    const { data: updatedOrder } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    return cors(json({
      success: true,
      message: "Order status updated successfully",
      data: deepToCamelCase(updatedOrder),
    }), req);

  } catch (e) {
    console.error("ORDER STATUS UPDATE ERROR:", e);
    return cors(error("Internal server error", 500), req);
  }
});
