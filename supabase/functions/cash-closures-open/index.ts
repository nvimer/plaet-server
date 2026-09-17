import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUserFromRequest, writeRestaurantId, cors, json, error, deepToCamelCase } from "../_shared/auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return cors(new Response(null, { status: 204 }), req);
  if (req.method !== "POST") return cors(error("Method not allowed", 405), req);

  const user = await getUserFromRequest(req);
  if (!user) return cors(error("Unauthorized", 401), req);

  try {
    const input = await req.json();

    if (input.openingBalance === undefined || input.openingBalance < 0) {
      return cors(error("Opening balance is required and must be non-negative", 400), req);
    }

    const restaurantId = writeRestaurantId(user, input.restaurantId);
    if (!restaurantId) return cors(error("Restaurant context required", 400, "TENANT_REQUIRED"), req);

    const supabase = getSupabase();

    // Check for existing open closure
    const { data: existingOpen } = await supabase
      .from("cash_closures")
      .select("id")
      .eq("restaurant_id", restaurantId)
      .eq("status", "OPEN")
      .eq("deleted", false)
      .limit(1)
      .maybeSingle();

    if (existingOpen) {
      return cors(error("There is already an open cash closure. Please close it first.", 400, "CLOSURE_ALREADY_OPEN"), req);
    }

    const { data: newClosure, error: createError } = await supabase
      .from("cash_closures")
      .insert({
        opened_by_id: user.id,
        opening_date: new Date().toISOString(),
        opening_balance: input.openingBalance,
        expected_balance: input.openingBalance,
        status: "OPEN",
        restaurant_id: restaurantId,
        updated_at: new Date().toISOString(),
      })
      .select(`
        id, opened_by_id, opening_date, opening_balance, status,
        created_at, restaurant_id,
        opened_by:users!cash_closures_opened_by_id_fkey(id, first_name, last_name)
      `)
      .single();

    if (createError) {
      console.error("Create error:", createError);
      return cors(error("Failed to open cash closure", 500), req);
    }

    return cors(json({
      success: true,
      message: "Cash closure opened successfully",
      data: deepToCamelCase(newClosure),
    }, 201), req);

  } catch (e) {
    console.error("CASH CLOSURE OPEN ERROR:", e);
    return cors(error("Internal server error", 500), req);
  }
});
