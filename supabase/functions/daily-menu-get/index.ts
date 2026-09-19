import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUserFromRequest, tenantScope, cors, json, error } from "../_shared/auth.ts";
import { getRestaurantTimeZone, localDay } from "../_shared/time.ts";
import { DAILY_MENU_COLUMNS, toDailyMenuResponse } from "../_shared/daily-menu.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
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
    const dateParam = url.searchParams.get("date");

    if (dateParam && dateParam !== "current" && !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      return cors(error("Date must be YYYY-MM-DD", 400), req);
    }

    const supabase = getSupabase();
    const timeZone = await getRestaurantTimeZone(supabase, scope);
    // created_at is a DATE: the menu belongs to the restaurant's local day.
    const day = !dateParam || dateParam === "current" ? localDay(new Date(), timeZone) : dateParam;

    let query = supabase
      .from("daily_menus")
      .select(DAILY_MENU_COLUMNS)
      .eq("created_at", day)
      .eq("deleted", false);

    if (scope) query = query.eq("restaurant_id", scope);

    const { data: menu, error: queryError } = await query
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (queryError) {
      console.error("Query error:", JSON.stringify(queryError));
      return cors(error("Failed to fetch daily menu", 500), req);
    }

    return cors(json({
      success: true,
      message: menu ? "Daily menu fetched successfully" : "No daily menu for this date",
      data: await toDailyMenuResponse(supabase, menu),
    }), req);

  } catch (e) {
    console.error("DAILY MENU GET ERROR:", e);
    return cors(error("Internal server error", 500), req);
  }
});
