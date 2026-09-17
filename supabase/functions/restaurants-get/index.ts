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

    if (!id) return cors(error("Restaurant ID is required", 400), req);

    const supabase = getSupabase();

    const { data: restaurant, error: queryError } = await supabase
      .from("restaurants")
      .select("id, name, slug, status, address, phone, nit, logo_url, currency, timezone, created_at, updated_at")
      .eq("id", id)
      .eq("deleted", false)
      .single();

    if (queryError || !restaurant) {
      return cors(error("Restaurant not found", 404), req);
    }

    return cors(json({
      success: true,
      message: "Restaurant fetched successfully",
      data: {
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
        status: restaurant.status,
        address: restaurant.address,
        phone: restaurant.phone,
        nit: restaurant.nit,
        logoUrl: restaurant.logo_url,
        currency: restaurant.currency,
        timezone: restaurant.timezone,
        createdAt: restaurant.created_at,
        updatedAt: restaurant.updated_at,
      },
    }), req);

  } catch (e) {
    console.error("RESTAURANTS GET ERROR:", e);
    return cors(error("Internal server error", 500), req);
  }
});
