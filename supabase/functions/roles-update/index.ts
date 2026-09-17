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

  const user = getUserFromRequest(req);
  if (!user) return cors(error("Unauthorized", 401), req);

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) return cors(error("Role ID is required", 400), req);

    const body = await req.json();
    const { name, description } = body;

    const supabase = getSupabase();

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;

    const { data: role, error: updateError } = await supabase
      .from("roles")
      .update(updateData)
      .eq("id", id)
      .eq("deleted", false)
      .select("id, name, description, restaurant_id, created_at, updated_at")
      .single();

    if (updateError) {
      console.error("Update error:", updateError);
      if (updateError.code === "23505") {
        return cors(error("Role name already exists", 409), req);
      }
      return cors(error("Failed to update role", 500), req);
    }

    if (!role) return cors(error("Role not found", 404), req);

    return cors(json({
      success: true,
      message: "Role updated successfully",
      data: role,
    }), req);

  } catch (e) {
    console.error("ROLES UPDATE ERROR:", e);
    return cors(error("Internal server error", 500), req);
  }
});
