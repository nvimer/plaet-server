import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUserFromRequest, canAccessRestaurant, hasRole, cors, json, error, deepToCamelCase } from "../_shared/auth.ts";
import { USER_COLUMNS, withRoles } from "../_shared/users.ts";

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

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id") ?? url.pathname.split("/").pop();
    if (!id) return cors(error("User ID is required", 400), req);

    // Anyone can read themselves; reading someone else is an admin action.
    if (id !== user.id && !hasRole(user, "ADMIN", "SUPERADMIN")) {
      return cors(error("Forbidden", 403), req);
    }

    const supabase = getSupabase();

    const { data: target, error: queryError } = await supabase
      .from("users")
      .select(USER_COLUMNS)
      .eq("id", id)
      .eq("deleted", false)
      .maybeSingle();

    if (queryError || !target || !canAccessRestaurant(user, target.restaurant_id)) {
      return cors(error("User not found", 404, "USER_NOT_FOUND"), req);
    }

    const withPermissions = url.searchParams.get("withPermissions") === "true";
    const result = withRoles(target) as Record<string, unknown> & { roles: { id: number }[] };

    if (withPermissions) {
      const roleIds = result.roles.map(r => r.id);
      const { data: rolePermissions } = roleIds.length
        ? await supabase
            .from("role_permissions")
            .select("role_id, permission:permissions(id, name, description)")
            .in("role_id", roleIds)
        : { data: [] };

      result.permissions = [...new Map(
        (rolePermissions || [])
          // deno-lint-ignore no-explicit-any
          .map((rp: any) => rp.permission)
          .filter(Boolean)
          // deno-lint-ignore no-explicit-any
          .map((p: any) => [p.id, p])
      ).values()];
    }

    return cors(json({
      success: true,
      message: "User fetched successfully",
      data: deepToCamelCase(result),
    }), req);

  } catch (e) {
    console.error("USER GET ERROR:", e);
    return cors(error("Internal server error", 500), req);
  }
});
