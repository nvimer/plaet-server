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
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const search = url.searchParams.get("search") || "";
    const status = url.searchParams.get("status") || "";

    const supabase = getSupabase();

    let query = supabase
      .from("restaurants")
      .select("id, name, slug, status, address, phone, nit, logo_url, currency, timezone, created_at, updated_at")
      .eq("deleted", false)
      .order("name", { ascending: true });

    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    if (status) {
      query = query.eq("status", status);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: restaurants, error: queryError } = await query;

    if (queryError) {
      console.error("Query error:", queryError);
      return cors(error("Failed to fetch restaurants", 500), req);
    }

    const mapped = (restaurants || []).map((r: Record<string, unknown>) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      status: r.status,
      address: r.address || null,
      phone: r.phone || null,
      nit: r.nit || null,
      logoUrl: r.logo_url || null,
      currency: r.currency || "COP",
      timezone: r.timezone || "America/Bogota",
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    return cors(json({
      success: true,
      message: "Restaurants fetched successfully",
      data: mapped,
      meta: {
        total: mapped.length,
        page,
        limit,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: page > 1,
      },
    }), req);

  } catch (e) {
    console.error("RESTAURANTS LIST ERROR:", e);
    return cors(error("Internal server error", 500), req);
  }
});
