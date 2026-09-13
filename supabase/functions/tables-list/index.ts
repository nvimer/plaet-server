import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUserFromRequest, cors, json, error } from "../_shared/auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return cors(new Response(null, { status: 204 }));
  if (req.method !== "GET") return cors(error("Method not allowed", 405));

  const user = getUserFromRequest(req);
  if (!user) return cors(error("Unauthorized", 401));

  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status");

    const supabase = getSupabase();

    let query = supabase
      .from("tables")
      .select("id, number, status, location, restaurant_id, created_at, updated_at")
      .eq("deleted", false)
      .order("number", { ascending: true });

    if (user.restaurantId) {
      query = query.eq("restaurant_id", user.restaurantId);
    }

    if (status) {
      query = query.eq("status", status);
    }

    const { data: tables, error: queryError } = await query;

    if (queryError) {
      console.error("Query error:", queryError);
      return cors(error("Failed to fetch tables", 500));
    }

    return cors(json({
      success: true,
      message: "Tables fetched successfully",
      data: tables || [],
    }));

  } catch (e) {
    console.error("TABLES LIST ERROR:", e);
    return cors(error("Internal server error", 500));
  }
});
