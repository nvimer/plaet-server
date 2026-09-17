import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUserFromRequest, cors, json, error } from "../_shared/auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return cors(new Response(null, { status: 204 }), req);
  if (req.method !== "PATCH") return cors(error("Method not allowed", 405), req);

  const user = await getUserFromRequest(req);
  if (!user) return cors(error("Unauthorized", 401), req);

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) return cors(error("Restaurant ID is required", 400), req);

    const body = await req.json();
    const { name, slug, status, address, phone, nit, logoUrl, currency, timezone } = body;

    const supabase = getSupabase();

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name;
    if (slug !== undefined) updateData.slug = slug;
    if (status !== undefined) updateData.status = status;
    if (address !== undefined) updateData.address = address;
    if (phone !== undefined) updateData.phone = phone;
    if (nit !== undefined) updateData.nit = nit;
    if (logoUrl !== undefined) updateData.logo_url = logoUrl;
    if (currency !== undefined) updateData.currency = currency;
    if (timezone !== undefined) updateData.timezone = timezone;

    const { data: restaurant, error: updateError } = await supabase
      .from("restaurants")
      .update(updateData)
      .eq("id", id)
      .eq("deleted", false)
      .select("id, name, slug, status, address, phone, nit, logo_url, currency, timezone, created_at, updated_at")
      .single();

    if (updateError) {
      console.error("Update error:", updateError);
      if (updateError.code === "23505") {
        return cors(error("Restaurant slug already exists", 409), req);
      }
      return cors(error("Failed to update restaurant", 500), req);
    }

    if (!restaurant) return cors(error("Restaurant not found", 404), req);

    return cors(json({
      success: true,
      message: "Restaurant updated successfully",
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
    console.error("RESTAURANTS UPDATE ERROR:", e);
    return cors(error("Internal server error", 500), req);
  }
});
