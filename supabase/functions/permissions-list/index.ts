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

  const user = await getUserFromRequest(req);
  if (!user) return cors(error("Unauthorized", 401), req);

  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "100");

    const supabase = getSupabase();

    let query = supabase
      .from("permissions")
      .select("id, name, description, created_at, updated_at", { count: "exact" })
      .order("name", { ascending: true });

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: permissions, error: queryError } = await query;

    if (queryError) {
      console.error("Query error:", queryError);
      return cors(error("Failed to fetch permissions", 500), req);
    }

    return cors(json({
      success: true,
      message: "Permissions fetched successfully",
      data: permissions || [],
      meta: {
        total: permissions?.length || 0,
        page,
        limit,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: page > 1,
      },
    }), req);

  } catch (e) {
    console.error("PERMISSIONS LIST ERROR:", e);
    return cors(error("Internal server error", 500), req);
  }
});
