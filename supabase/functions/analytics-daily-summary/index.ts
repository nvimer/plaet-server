import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUserFromRequest, tenantScope, cors, json, error } from "../_shared/auth.ts";
import { getRestaurantTimeZone, localDayRange } from "../_shared/time.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PACKAGING_KEYWORDS = ["portacomida", "empaque"];

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

interface ItemRow {
  quantity: number;
  price_at_order: number;
  notes: string | null;
  menu_item: { id: number; name: string; category: { name: string; type: string } | null } | null;
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
    const date = url.searchParams.get("date");

    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return cors(error("Date must be YYYY-MM-DD", 400), req);
    }

    const supabase = getSupabase();
    const timeZone = await getRestaurantTimeZone(supabase, scope);
    const day = localDayRange(date || new Date(), timeZone);

    let ordersQuery = supabase
      .from("orders")
      .select(`
        id, total_amount,
        payments(method, amount),
        items:order_items(
          quantity, price_at_order, notes,
          menu_item:menu_items(id, name, category:menu_categories(name, type))
        )
      `)
      .eq("status", "PAID")
      .eq("deleted", false)
      .gte("created_at", day.start)
      .lte("created_at", day.end);

    let expensesQuery = supabase
      .from("expenses")
      .select("amount")
      .eq("deleted", false)
      .gte("date", day.start)
      .lte("date", day.end);

    let usagesQuery = supabase
      .from("ticket_book_usages")
      .select("portion_count")
      .gte("created_at", day.start)
      .lte("created_at", day.end);

    if (scope) {
      ordersQuery = ordersQuery.eq("restaurant_id", scope);
      expensesQuery = expensesQuery.eq("restaurant_id", scope);
      usagesQuery = usagesQuery.eq("restaurant_id", scope);
    }

    const [{ data: orders, error: ordersError }, { data: expenses }, { data: usages }] = await Promise.all([
      ordersQuery, expensesQuery, usagesQuery,
    ]);

    if (ordersError) {
      console.error("Query error:", JSON.stringify(ordersError));
      return cors(error("Failed to build the daily summary", 500), req);
    }

    const byPaymentMethod: Record<string, number> = { CASH: 0, NEQUI: 0, TICKET_BOOK: 0 };
    const byCategory: Record<string, number> = {};
    const byProtein: Record<string, number> = {};
    const products: Record<string, { id: number | string; name: string; quantity: number; totalRevenue: number }> = {};

    let totalSold = 0;
    let packagingCount = 0;

    for (const order of orders || []) {
      totalSold += Number(order.total_amount);

      for (const payment of order.payments || []) {
        byPaymentMethod[payment.method] = (byPaymentMethod[payment.method] || 0) + Number(payment.amount);
      }

      for (const item of (order.items || []) as unknown as ItemRow[]) {
        const revenue = Number(item.price_at_order) * item.quantity;
        const categoryName = item.menu_item?.category?.name || "Otros";
        byCategory[categoryName] = (byCategory[categoryName] || 0) + revenue;

        // Proteins come from the category role, so renaming the category is safe.
        if (item.menu_item?.category?.type === "PROTEIN") {
          const name = item.menu_item?.name || "Proteína Desconocida";
          byProtein[name] = (byProtein[name] || 0) + item.quantity;
        }

        const notes = (item.notes || "").toLowerCase();
        if (PACKAGING_KEYWORDS.some(k => notes.includes(k))) packagingCount += item.quantity;

        const key = item.menu_item?.id ? `menu-${item.menu_item.id}` : `manual-${item.notes || "Otro"}`;
        products[key] ??= {
          id: item.menu_item?.id || key,
          name: item.menu_item?.name || item.notes || "Producto Manual",
          quantity: 0,
          totalRevenue: 0,
        };
        products[key].quantity += item.quantity;
        products[key].totalRevenue += revenue;
      }
    }

    const totalExpenses = (expenses || []).reduce((sum, e) => sum + Number(e.amount), 0);
    const portionsCount = (usages || []).reduce((sum, u) => sum + Number(u.portion_count || 0), 0);

    return cors(json({
      success: true,
      message: "Daily summary built successfully",
      data: {
        salesSummary: {
          totalSold,
          orderCount: orders?.length || 0,
          packagingCount,
          portionsCount,
          byPaymentMethod,
          byCategory: Object.entries(byCategory).map(([name, total]) => ({ name, total })),
          byProtein: Object.entries(byProtein).map(([name, quantity]) => ({ name, quantity })),
        },
        topProducts: Object.values(products).sort((a, b) => b.quantity - a.quantity).slice(0, 10),
        totalExpenses,
        netBalance: totalSold - totalExpenses,
      },
    }), req);

  } catch (e) {
    console.error("DAILY SUMMARY ERROR:", e);
    return cors(error("Internal server error", 500), req);
  }
});
