import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUserFromRequest, tenantScope, cors, json, error } from "../_shared/auth.ts";
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
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20")));

    const supabase = getSupabase();

    let query = supabase
      .from("daily_menus")
      .select(DAILY_MENU_COLUMNS)
      .eq("deleted", false)
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    let countQuery = supabase
      .from("daily_menus")
      .select("id", { count: "exact", head: true })
      .eq("deleted", false);

    if (scope) {
      query = query.eq("restaurant_id", scope);
      countQuery = countQuery.eq("restaurant_id", scope);
    }

    const { data: menus, error: queryError } = await query;

    if (queryError) {
      console.error("Query error:", JSON.stringify(queryError));
      return cors(error("Failed to fetch daily menu history", 500), req);
    }

    const { count: total } = await countQuery;
    const data = await Promise.all((menus || []).map(m => toDailyMenuResponse(supabase, m)));

    return cors(json({
      success: true,
      message: "Daily menu history fetched successfully",
      data,
      meta: {
        page,
        limit,
        total: total || 0,
        totalPages: Math.ceil((total || 0) / limit),
      },
    }), req);

  } catch (e) {
    console.error("DAILY MENU HISTORY ERROR:", e);
    return cors(error("Internal server error", 500), req);
  }
});
