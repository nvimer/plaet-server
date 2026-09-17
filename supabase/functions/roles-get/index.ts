import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUserFromRequest, cors, json, error } from "../_shared/auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return cors(new Response(null, { status: 204 }), req);
  if (req.method !== "GET") return cors(error("Method not allowed", 405), req);

  const user = getUserFromRequest(req);
  if (!user) return cors(error("Unauthorized", 401), req);

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) return cors(error("Role ID is required", 400), req);

    const supabase = getSupabase();

    const { data: role, error: queryError } = await supabase
      .from("roles")
      .select("id, name, description, restaurant_id, created_at, updated_at")
      .eq("id", id)
      .eq("deleted", false)
      .single();

    if (queryError || !role) {
      return cors(error("Role not found", 404), req);
    }

    // Get permissions for this role
    const { data: rolePermissions } = await supabase
      .from("role_permissions")
      .select("permission_id")
      .eq("role_id", id);

    const permissionIds = rolePermissions?.map((rp: { permission_id: number }) => rp.permission_id) || [];

    return cors(json({
      success: true,
      message: "Role fetched successfully",
      data: { ...role, permissionIds },
    }), req);

  } catch (e) {
    console.error("ROLES GET ERROR:", e);
    return cors(error("Internal server error", 500), req);
  }
});
