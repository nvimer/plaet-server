import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUserFromRequest, canAccessRestaurant, hasRole, cors, json, error } from "../_shared/auth.ts";

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
  if (!hasRole(user, "ADMIN", "SUPERADMIN")) return cors(error("Forbidden", 403), req);

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) return cors(error("Role ID is required", 400), req);

    const supabase = getSupabase();

    const { data: target } = await supabase
      .from("roles")
      .select("id, name, restaurant_id")
      .eq("id", id)
      .eq("deleted", false)
      .maybeSingle();

    if (!target || !canAccessRestaurant(user, target.restaurant_id)) {
      return cors(error("Role not found", 404), req);
    }
    if (target.name === "SUPERADMIN" && !hasRole(user, "SUPERADMIN")) {
      return cors(error("Forbidden", 403), req);
    }

    const { error: deleteError } = await supabase
      .from("roles")
      .update({ deleted: true, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("deleted", false);

    if (deleteError) {
      console.error("Delete error:", deleteError);
      return cors(error("Failed to delete role", 500), req);
    }

    return cors(json({
      success: true,
      message: "Role deleted successfully",
      data: null,
    }), req);

  } catch (e) {
    console.error("ROLES DELETE ERROR:", e);
    return cors(error("Internal server error", 500), req);
  }
});
