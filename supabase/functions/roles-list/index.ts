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
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "100");

    const supabase = getSupabase();

    let query = supabase
      .from("roles")
      .select("id, name, description, restaurant_id, created_at, updated_at")
      .eq("deleted", false)
      .order("name", { ascending: true });

    if (user.restaurantId) {
      query = query.eq("restaurant_id", user.restaurantId);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: roles, error: queryError } = await query;

    if (queryError) {
      console.error("Query error:", queryError);
      return cors(error("Failed to fetch roles", 500), req);
    }

    // Fetch role_permissions for all roles
    const roleIds = (roles || []).map((r: { id: number }) => r.id);
    let permissionsMap: Record<number, Array<{ roleId: number; permissionId: number; permission: { id: number; name: string; description: string } }>> = {};

    if (roleIds.length > 0) {
      const { data: rolePerms } = await supabase
        .from("role_permissions")
        .select("role_id, permission_id, permissions(id, name, description)")
        .in("role_id", roleIds);

      if (rolePerms) {
        for (const rp of rolePerms as Array<{ role_id: number; permission_id: number; permissions: { id: number; name: string; description: string } | null }>) {
          if (!permissionsMap[rp.role_id]) permissionsMap[rp.role_id] = [];
          if (rp.permissions) {
            permissionsMap[rp.role_id].push({
              roleId: rp.role_id,
              permissionId: rp.permission_id,
              permission: rp.permissions,
            });
          }
        }
      }
    }

    const rolesWithPerms = (roles || []).map((role: { id: number; name: string; description: string | null; restaurant_id: string | null; created_at: string; updated_at: string }) => ({
      ...role,
      permissions: permissionsMap[role.id] || [],
    }));

    return cors(json({
      success: true,
      message: "Roles fetched successfully",
      data: rolesWithPerms,
      meta: {
        total: rolesWithPerms.length,
        page,
        limit,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: page > 1,
      },
    }), req);

  } catch (e) {
    console.error("ROLES LIST ERROR:", e);
    return cors(error("Internal server error", 500), req);
  }
});
