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

    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return cors(error("Amount must be a positive number", 400), req);
    }
    if (!input.category || typeof input.category !== "string") {
      return cors(error("Category is required", 400), req);
    }

    const restaurantId = writeRestaurantId(user, input.restaurantId);
    if (!restaurantId) return cors(error("Restaurant context required", 400, "TENANT_REQUIRED"), req);

    const supabase = getSupabase();

    // Expenses belong to the open register, so the closure totals stay right.
    const { data: closure } = await supabase
      .from("cash_closures")
      .select("id")
      .eq("restaurant_id", restaurantId)
      .eq("status", "OPEN")
      .eq("deleted", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!closure) {
      return cors(error("No hay un turno de caja abierto. Por favor abre caja antes de registrar gastos.", 400, "CASH_CLOSURE_REQUIRED"), req);
    }

    const now = new Date().toISOString();
    const { data: expense, error: createError } = await supabase
      .from("expenses")
      .insert({
        date: input.date || now,
        amount,
        description: input.description || null,
        category: input.category.trim(),
        registered_by_id: user.id,
        restaurant_id: restaurantId,
        cash_closure_id: closure.id,
        updated_at: now,
      })
      .select(`
        id, date, amount, description, category, created_at, updated_at,
        restaurant_id, cash_closure_id, registered_by_id,
        registered_by:users!expenses_registered_by_id_fkey(id, first_name, last_name)
      `)
      .single();

    if (createError) {
      console.error("Create error:", JSON.stringify(createError));
      return cors(error("Failed to create expense", 500), req);
    }

    return cors(json({
      success: true,
      message: "Expense created successfully",
      data: deepToCamelCase(expense),
    }, 201), req);

  } catch (e) {
    console.error("EXPENSE CREATE ERROR:", e);
    return cors(error("Internal server error", 500), req);
  }
});
