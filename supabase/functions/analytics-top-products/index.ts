import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUserFromRequest, tenantScope, cors, json, error } from "../_shared/auth.ts";
import { getRestaurantTimeZone, localDayRange } from "../_shared/time.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

interface ItemRow {
  quantity: number;
  price_at_order: number;
  notes: string | null;
  menu_item: { id: number; name: string } | null;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return cors(new Response(null, { status: 204 }), req);
  if (req.method !== "GET") return cors(error("Method not allowed", 405), req);

  const user = await getUserFromRequest(req);
  if (!user) return cors(error("Unauthorized", 401), req);

  const scope = tenantScope(user);
  if (scope === false) return cors(error("Restaurant context required", 403, "TENANT_REQUIRED"), req);

  try {
    const url = new URL(req.url);
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "10")));

    const supabase = getSupabase();
    const timeZone = await getRestaurantTimeZone(supabase, scope);
    const from = localDayRange(startDate || new Date(), timeZone).start;
    const to = localDayRange(endDate || startDate || new Date(), timeZone).end;

    let query = supabase
      .from("orders")
      .select(`
        id,
        items:order_items(quantity, price_at_order, notes, menu_item:menu_items(id, name))
      `)
      .eq("status", "PAID")
      .eq("deleted", false)
      .gte("created_at", from)
      .lte("created_at", to);

    if (scope) query = query.eq("restaurant_id", scope);

    const { data: orders, error: queryError } = await query;

    if (queryError) {
      console.error("Query error:", JSON.stringify(queryError));
      return cors(error("Failed to fetch top products", 500), req);
    }

    const products: Record<string, { id: number | string; name: string; quantity: number; totalRevenue: number }> = {};

    for (const order of orders || []) {
      for (const item of (order.items || []) as unknown as ItemRow[]) {
        const key = item.menu_item?.id ? `menu-${item.menu_item.id}` : `manual-${item.notes || "Otro"}`;
        products[key] ??= {
          id: item.menu_item?.id || key,
          name: item.menu_item?.name || item.notes || "Producto Manual",
          quantity: 0,
          totalRevenue: 0,
        };
        products[key].quantity += item.quantity;
        products[key].totalRevenue += Number(item.price_at_order) * item.quantity;
      }
    }

    return cors(json({
      success: true,
      message: "Top products fetched successfully",
      data: Object.values(products).sort((a, b) => b.quantity - a.quantity).slice(0, limit),
    }), req);

  } catch (e) {
    console.error("TOP PRODUCTS ERROR:", e);
    return cors(error("Internal server error", 500), req);
  }
});
