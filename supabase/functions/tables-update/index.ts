import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUserFromRequest, canAccessRestaurant } from "../_shared/auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

function getOrigin(req: Request): string {
  const allowed = (Deno.env.get("ALLOWED_ORIGINS") || "").split(",").map(s => s.trim()).filter(Boolean);
  const origin = req.headers.get("Origin") || "";
  if (allowed.length === 0) return "*";
  return allowed.includes(origin) ? origin : allowed[0];
}

function cors(res: Response, req: Request): Response {
  const h = new Headers(res.headers);
  h.set("Access-Control-Allow-Origin", getOrigin(req));
  h.set("Access-Control-Allow-Methods", "PATCH, OPTIONS");
  h.set("Access-Control-Allow-Headers", "Content-Type, Authorization, apikey");
  h.set("Access-Control-Allow-Credentials", "true");
  return new Response(res.body, { ...res, headers: h });
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return cors(new Response(null, { status: 204 }), req);
  if (req.method !== "PATCH") return cors(json({ success: false, message: "Method not allowed" }, 405), req);

  try {
    const user = await getUserFromRequest(req);
    if (!user) return cors(json({ success: false, message: "Unauthorized" }, 401), req);

    const body = await req.json();
    const { id, ...input } = body;

    if (!id || isNaN(parseInt(id))) {
      return cors(json({ success: false, message: "Table ID is required" }, 400), req);
    }

    const supabase = getSupabase();

    const { data: existingTable } = await supabase
      .from("tables")
      .select("id, restaurant_id")
      .eq("id", parseInt(id))
      .eq("deleted", false)
      .single();

    if (!existingTable) {
      return cors(json({ success: false, message: "Table not found" }, 404), req);
    }

    if (!canAccessRestaurant(user, existingTable.restaurant_id)) {
      return cors(json({ success: false, message: "Forbidden" }, 403), req);
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.status !== undefined) updateData.status = input.status;
    if (input.location !== undefined) updateData.location = input.location;
    if (input.number !== undefined) updateData.number = String(input.number);

    const { data: updatedTable, error: updateError } = await supabase
      .from("tables")
      .update(updateData)
      .eq("id", parseInt(id))
      .select("id, number, status, location, restaurant_id, created_at, updated_at")
      .single();

    if (updateError) {
      console.error("Update error:", updateError);
      return cors(json({ success: false, message: updateError.message }, 500), req);
    }

    return cors(json({
      success: true,
      message: "Table updated successfully",
      data: {
        id: updatedTable.id,
        number: updatedTable.number,
        status: updatedTable.status,
        location: updatedTable.location,
        restaurantId: updatedTable.restaurant_id,
        createdAt: updatedTable.created_at,
        updatedAt: updatedTable.updated_at,
      },
    }), req);

  } catch (e) {
    console.error("TABLE UPDATE ERROR:", e);
    return cors(json({ success: false, message: e instanceof Error ? e.message : String(e) }, 500), req);
  }
});
