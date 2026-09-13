import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUserFromRequest, cors, json, error } from "../_shared/auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return cors(new Response(null, { status: 204 }));
  if (req.method !== "GET") return cors(error("Method not allowed", 405));

  const user = getUserFromRequest(req);
  if (!user) return cors(error("Unauthorized", 401));

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const orderId = pathParts[pathParts.length - 1];

    if (!orderId || !orderId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return cors(error("Invalid order ID", 400));
    }

    const supabase = getSupabase();

    const { data: order, error: queryError } = await supabase
      .from("orders")
      .select(`
        id, waiter_id, table_id, "customerId", status, type, total_amount,
        notes, whatsapp_order_id, created_at, updated_at, restaurant_id,
        items:order_items(
          id, menu_item_id, quantity, price_at_order, notes, status, created_at,
          menu_item:menu_items(id, name, price, category_id, is_available, inventory_type, stock_quantity)
        ),
        table:tables(id, number, status),
        waiter:users!orders_waiter_id_fkey(id, first_name, last_name, email),
        customer:customers(id, first_name, last_name, phone, phone2, address1, address2),
        payments(id, amount, method, created_at, cash_closure_id)
      `)
      .eq("id", orderId)
      .eq("deleted", false)
      .single();

    if (queryError || !order) {
      return cors(error("Order not found", 404, "ORDER_NOT_FOUND"));
    }

    if (user.restaurantId && order.restaurant_id !== user.restaurantId) {
      return cors(error("Forbidden", 403));
    }

    return cors(json({
      success: true,
      message: "Order fetched successfully",
      data: order,
    }));

  } catch (e) {
    console.error("ORDER GET ERROR:", e);
    return cors(error("Internal server error", 500));
  }
});
