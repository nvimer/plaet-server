import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUserFromRequest, cors, json, error, deepToCamelCase } from "../_shared/auth.ts";
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
    const supabase = getSupabase();

    const { data: me, error: queryError } = await supabase
      .from("users")
      .select(USER_COLUMNS)
      .eq("id", user.id)
      .eq("deleted", false)
      .maybeSingle();

    if (queryError || !me) {
      return cors(error("User not found", 404, "USER_NOT_FOUND"), req);
    }

    const result = withRoles(me) as Record<string, unknown> & { roles: { id: number }[] };

    const roleIds = result.roles.map(r => r.id);
    const { data: rolePermissions } = roleIds.length
      ? await supabase
          .from("role_permissions")
          .select("permission:permissions(id, name, description)")
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

    const { data: restaurant } = me.restaurant_id
      ? await supabase
          .from("restaurants")
          .select("id, name, slug, logo_url, currency, timezone, status")
          .eq("id", me.restaurant_id)
          .maybeSingle()
      : { data: null };

    return cors(json({
      success: true,
      message: "Profile fetched successfully",
      data: deepToCamelCase({ ...result, restaurant }),
    }), req);

  } catch (e) {
    console.error("PROFILE ME ERROR:", e);
    return cors(error("Internal server error", 500), req);
  }
});
