import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUserFromRequest, cors, json, error } from "../_shared/auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  OPEN: ["SENT_TO_CASHIER", "IN_KITCHEN", "CANCELLED"],
  SENT_TO_CASHIER: ["PAID", "CANCELLED"],
  PAID: ["IN_KITCHEN", "CANCELLED"],
  IN_KITCHEN: ["READY", "CANCELLED"],
  READY: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return cors(new Response(null, { status: 204 }));
  if (req.method !== "PATCH") return cors(error("Method not allowed", 405));

  const user = getUserFromRequest(req);
  if (!user) return cors(error("Unauthorized", 401));

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const orderId = pathParts[pathParts.length - 2]; // /orders/:id/status

    if (!orderId) return cors(error("Order ID required", 400));

    const { status: newStatus } = await req.json();

    if (!newStatus) return cors(error("Status is required", 400));

    const supabase = getSupabase();

    // Get current order
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("id, status, restaurant_id")
      .eq("id", orderId)
      .eq("deleted", false)
      .single();

    if (fetchError || !order) {
      return cors(error("Order not found", 404, "ORDER_NOT_FOUND"));
    }

    if (user.restaurantId && order.restaurant_id !== user.restaurantId) {
      return cors(error("Forbidden", 403));
    }

    // Validate status transition
    const allowedTransitions = VALID_TRANSITIONS[order.status] || [];
    if (!allowedTransitions.includes(newStatus)) {
      return cors(error(`Cannot transition from ${order.status} to ${newStatus}`, 400, "INVALID_TRANSITION"));
    }

    // Update order status
    const { error: updateError } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId);

    if (updateError) {
      console.error("Update error:", updateError);
      return cors(error("Failed to update order status", 500));
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
      data: updatedOrder,
    }));

  } catch (e) {
    console.error("ORDER STATUS UPDATE ERROR:", e);
    return cors(error("Internal server error", 500));
  }
});
