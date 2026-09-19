import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUserFromRequest, tenantScope, hasRole, cors, json, error, deepToCamelCase } from "../_shared/auth.ts";
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
  if (!hasRole(user, "ADMIN", "SUPERADMIN")) return cors(error("Forbidden", 403), req);

  const scope = tenantScope(user);
  if (scope === false) return cors(error("Restaurant context required", 403, "TENANT_REQUIRED"), req);

  try {
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20")));
    const search = url.searchParams.get("search");

    const supabase = getSupabase();

    let query = supabase
      .from("users")
      .select(USER_COLUMNS)
      .eq("deleted", false)
      .order("first_name", { ascending: true })
      .range((page - 1) * limit, page * limit - 1);

    let countQuery = supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("deleted", false);

    if (scope) {
      query = query.eq("restaurant_id", scope);
      countQuery = countQuery.eq("restaurant_id", scope);
    }

    if (search) {
      const filter = `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`;
      query = query.or(filter);
      countQuery = countQuery.or(filter);
    }

    const { data: users, error: queryError } = await query;

    if (queryError) {
      console.error("Query error:", JSON.stringify(queryError));
      return cors(error("Failed to fetch users", 500), req);
    }

    const { count: total } = await countQuery;

    return cors(json({
      success: true,
      message: "Users fetched successfully",
      data: deepToCamelCase((users || []).map(withRoles)),
      meta: {
        page,
        limit,
        total: total || 0,
        totalPages: Math.ceil((total || 0) / limit),
      },
    }), req);

  } catch (e) {
    console.error("USERS LIST ERROR:", e);
    return cors(error("Internal server error", 500), req);
  }
});
