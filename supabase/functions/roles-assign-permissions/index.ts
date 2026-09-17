import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUserFromRequest, cors, json, error } from "../_shared/auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return cors(new Response(null, { status: 204 }), req);
  if (req.method !== "POST") return cors(error("Method not allowed", 405), req);

  const user = getUserFromRequest(req);
  if (!user) return cors(error("Unauthorized", 401), req);

  try {
    const url = new URL(req.url);
    const roleId = url.searchParams.get("id");

    if (!roleId) return cors(error("Role ID is required", 400), req);

    const body = await req.json();
    const { permissionIds } = body;

    if (!Array.isArray(permissionIds)) {
      return cors(error("permissionIds must be an array", 400), req);
    }

    const supabase = getSupabase();

    // Delete existing permissions
    await supabase
      .from("role_permissions")
      .delete()
      .eq("role_id", roleId);

    // Insert new permissions
    if (permissionIds.length > 0) {
      const inserts = permissionIds.map((permissionId: number) => ({
        role_id: roleId,
        permission_id: permissionId,
      }));

      const { error: insertError } = await supabase
        .from("role_permissions")
        .insert(inserts);

      if (insertError) {
        console.error("Insert error:", insertError);
        return cors(error("Failed to assign permissions", 500), req);
      }
    }

    return cors(json({
      success: true,
      message: "Permissions assigned successfully",
      data: null,
    }), req);

  } catch (e) {
    console.error("ROLES ASSIGN PERMISSIONS ERROR:", e);
    return cors(error("Internal server error", 500), req);
  }
});
