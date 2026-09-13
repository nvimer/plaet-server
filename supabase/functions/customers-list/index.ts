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
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20")));
    const search = url.searchParams.get("search");

    const supabase = getSupabase();

    let query = supabase
      .from("customers")
      .select("id, first_name, last_name, phone, phone2, email, address1, address2, restaurant_id, created_at")
      .eq("deleted", false)
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (user.restaurantId) {
      query = query.eq("restaurant_id", user.restaurantId);
    }

    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data: customers, error: queryError } = await query;

    if (queryError) {
      console.error("Query error:", queryError);
      return cors(error("Failed to fetch customers", 500));
    }

    // Get total count
    let countQuery = supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("deleted", false);

    if (user.restaurantId) countQuery = countQuery.eq("restaurant_id", user.restaurantId);
    if (search) {
      countQuery = countQuery.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { count: total } = await countQuery;

    return cors(json({
      success: true,
      message: "Customers fetched successfully",
      data: customers || [],
      meta: {
        page,
        limit,
        total: total || 0,
        totalPages: Math.ceil((total || 0) / limit),
      },
    }));

  } catch (e) {
    console.error("CUSTOMERS LIST ERROR:", e);
    return cors(error("Internal server error", 500));
  }
});
