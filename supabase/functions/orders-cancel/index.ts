import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUserFromRequest, cors, json, error } from "../_shared/auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return cors(new Response(null, { status: 204 }));
  if (req.method !== "DELETE") return cors(error("Method not allowed", 405));

  const user = getUserFromRequest(req);
  if (!user) return cors(error("Unauthorized", 401));

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const orderId = pathParts[pathParts.length - 1];

    if (!orderId) return cors(error("Order ID required", 400));

    const supabase = getSupabase();

    // Get current order
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("id, status, table_id, restaurant_id")
      .eq("id", orderId)
      .eq("deleted", false)
      .single();

    if (fetchError || !order) {
      return cors(error("Order not found", 404, "ORDER_NOT_FOUND"));
    }

    if (user.restaurantId && order.restaurant_id !== user.restaurantId) {
      return cors(error("Forbidden", 403));
    }

    // Check if order can be cancelled
    if (order.status === "DELIVERED" || order.status === "CANCELLED") {
      return cors(error(`Cannot cancel order with status ${order.status}`, 400, "CANNOT_CANCEL"));
    }

    // Update order status to CANCELLED
    const { error: updateError } = await supabase
      .from("orders")
      .update({ status: "CANCELLED" })
      .eq("id", orderId);

    if (updateError) {
      console.error("Update error:", updateError);
      return cors(error("Failed to cancel order", 500));
    }

    // Revert stock for all items
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

    return cors(json({
      success: true,
      message: `Order with ID ${orderId} has been CANCELLED`,
      data: { id: orderId, status: "CANCELLED" },
    }));

  } catch (e) {
    console.error("ORDER CANCEL ERROR:", e);
    return cors(error("Internal server error", 500));
  }
});
