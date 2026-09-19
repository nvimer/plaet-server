import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUserFromRequest, tenantScope, cors, json, error, deepToCamelCase } from "../_shared/auth.ts";
import { getRestaurantTimeZone, localDayRange } from "../_shared/time.ts";

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
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const cashClosureId = url.searchParams.get("cashClosureId");

    const supabase = getSupabase();
    const timeZone = await getRestaurantTimeZone(supabase, scope);

    let query = supabase
      .from("expenses")
      .select(`
        id, date, amount, description, category, created_at, updated_at,
        restaurant_id, cash_closure_id, registered_by_id,
        registered_by:users!expenses_registered_by_id_fkey(id, first_name, last_name)
      `)
      .eq("deleted", false)
      .order("date", { ascending: false });

    if (scope) query = query.eq("restaurant_id", scope);
    if (cashClosureId) query = query.eq("cash_closure_id", cashClosureId);
    // Dates arrive as the restaurant's local calendar days.
    if (startDate) query = query.gte("date", localDayRange(startDate, timeZone).start);
    if (endDate) query = query.lte("date", localDayRange(endDate, timeZone).end);

    const { data: expenses, error: queryError } = await query;

    if (queryError) {
      console.error("Query error:", JSON.stringify(queryError));
      return cors(error("Failed to fetch expenses", 500), req);
    }

    const total = (expenses || []).reduce((sum, e) => sum + Number(e.amount), 0);

    return cors(json({
      success: true,
      message: "Expenses fetched successfully",
      data: deepToCamelCase(expenses || []),
      meta: { total: expenses?.length || 0, totalAmount: total },
    }), req);

  } catch (e) {
    console.error("EXPENSES LIST ERROR:", e);
    return cors(error("Internal server error", 500), req);
  }
});
