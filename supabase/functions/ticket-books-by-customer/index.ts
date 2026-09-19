import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUserFromRequest, tenantScope, cors, json, error, deepToCamelCase } from "../_shared/auth.ts";

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
    const customerId = url.searchParams.get("customerId") ?? url.pathname.split("/").pop();
    const status = url.searchParams.get("status");

    if (!customerId) return cors(error("Customer ID is required", 400), req);

    const supabase = getSupabase();

    let query = supabase
      .from("ticket_books")
      .select(`
        id, "customerId", purchase_date, expiry_date, total_portions,
        consumed_portions, purchase_price, status, restaurant_id, created_at
      `)
      .eq("customerId", customerId)
      .eq("deleted", false)
      .order("purchase_date", { ascending: false });

    if (scope) query = query.eq("restaurant_id", scope);
    if (status) query = query.eq("status", status);

    const { data: books, error: queryError } = await query;

    if (queryError) {
      console.error("Query error:", JSON.stringify(queryError));
      return cors(error("Failed to fetch ticket books", 500), req);
    }

    const withRemaining = (books || []).map(b => ({
      ...b,
      remaining_portions: Number(b.total_portions) - Number(b.consumed_portions),
      expired: new Date(b.expiry_date) < new Date(),
    }));

    return cors(json({
      success: true,
      message: "Ticket books fetched successfully",
      data: deepToCamelCase(withRemaining),
    }), req);

  } catch (e) {
    console.error("TICKET BOOKS BY CUSTOMER ERROR:", e);
    return cors(error("Internal server error", 500), req);
  }
});
