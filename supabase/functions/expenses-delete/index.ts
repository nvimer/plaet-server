import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUserFromRequest, canAccessRestaurant, cors, json, error } from "../_shared/auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return cors(new Response(null, { status: 204 }), req);
  if (req.method !== "DELETE") return cors(error("Method not allowed", 405), req);

  const user = await getUserFromRequest(req);
  if (!user) return cors(error("Unauthorized", 401), req);

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id") ?? url.pathname.split("/").pop();
    if (!id) return cors(error("Expense ID is required", 400), req);

    const supabase = getSupabase();

    const { data: existing } = await supabase
      .from("expenses")
      .select("id, restaurant_id, cash_closure_id")
      .eq("id", id)
      .eq("deleted", false)
      .maybeSingle();

    if (!existing || !canAccessRestaurant(user, existing.restaurant_id)) {
      return cors(error("Expense not found", 404, "EXPENSE_NOT_FOUND"), req);
    }

    // A closed register has already been counted; deleting would change history.
    if (existing.cash_closure_id) {
      const { data: closure } = await supabase
        .from("cash_closures")
        .select("status")
        .eq("id", existing.cash_closure_id)
        .maybeSingle();

      if (closure?.status === "CLOSED") {
        return cors(error("Cannot delete an expense from a closed register", 409, "CLOSURE_CLOSED"), req);
      }
    }

    const now = new Date().toISOString();
    const { error: deleteError } = await supabase
      .from("expenses")
      .update({ deleted: true, deleted_at: now, updated_at: now })
      .eq("id", id);

    if (deleteError) {
      console.error("Delete error:", JSON.stringify(deleteError));
      return cors(error("Failed to delete expense", 500), req);
    }

    return cors(json({ success: true, message: "Expense deleted successfully", data: null }), req);

  } catch (e) {
    console.error("EXPENSE DELETE ERROR:", e);
    return cors(error("Internal server error", 500), req);
  }
});
