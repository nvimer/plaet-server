import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUserFromRequest, tenantScope, cors, json, error } from "../_shared/auth.ts";
import { getRestaurantTimeZone, localDay, localDayRange } from "../_shared/time.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

/** Daily stock movement totals for the dashboard chart. */
Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return cors(new Response(null, { status: 204 }), req);
  if (req.method !== "GET") return cors(error("Method not allowed", 405), req);

  const user = await getUserFromRequest(req);
  if (!user) return cors(error("Unauthorized", 401), req);

  const scope = tenantScope(user);
  if (scope === false) return cors(error("Restaurant context required", 403, "TENANT_REQUIRED"), req);

  try {
    const url = new URL(req.url);
    const days = Math.min(90, Math.max(1, parseInt(url.searchParams.get("days") || "7")));

    const supabase = getSupabase();
    const timeZone = await getRestaurantTimeZone(supabase, scope);

    // Days are the restaurant's, not the server's.
    const today = new Date();
    const first = new Date(today.getTime() - (days - 1) * 86400000);
    const from = localDayRange(first, timeZone).start;
    const to = localDayRange(today, timeZone).end;

    let query = supabase
      .from("stock_adjustments")
      .select("adjustment_type, quantity, created_at")
      .gte("created_at", from)
      .lte("created_at", to);

    if (scope) query = query.eq("restaurant_id", scope);

    const { data: movements, error: queryError } = await query;

    if (queryError) {
      console.error("Query error:", JSON.stringify(queryError));
      return cors(error("Failed to fetch stock movements", 500), req);
    }

    const byDay = new Map<string, { date: string; added: number; removed: number; sold: number; reset: number; total: number }>();

    for (let i = 0; i < days; i++) {
      const date = localDay(new Date(first.getTime() + i * 86400000), timeZone);
      byDay.set(date, { date, added: 0, removed: 0, sold: 0, reset: 0, total: 0 });
    }

    for (const movement of movements || []) {
      const date = localDay(movement.created_at, timeZone);
      const bucket = byDay.get(date);
      if (!bucket) continue;

      const quantity = Number(movement.quantity) || 0;
      switch (movement.adjustment_type) {
        case "MANUAL_ADD": bucket.added += quantity; break;
        case "MANUAL_REMOVE": bucket.removed += quantity; break;
        case "ORDER_DEDUCT": bucket.sold += quantity; break;
        case "ORDER_CANCELLED": bucket.sold -= quantity; break;
        case "DAILY_RESET": bucket.reset += quantity; break;
      }
      bucket.total += 1;
    }

    return cors(json({
      success: true,
      message: "Stock movements fetched successfully",
      data: [...byDay.values()],
      meta: { days, timeZone },
    }), req);

  } catch (e) {
    console.error("STOCK MOVEMENTS ERROR:", e);
    return cors(error("Internal server error", 500), req);
  }
});
