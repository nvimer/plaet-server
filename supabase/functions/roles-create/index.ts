import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUserFromRequest, cors, json, error } from "../_shared/auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return cors(new Response(null, { status: 204 }), req);
  if (req.method !== "POST") return cors(error("Method not allowed", 405), req);

  const user = await getUserFromRequest(req);
  if (!user) return cors(error("Unauthorized", 401), req);

  try {
    const body = await req.json();
    const { name, description } = body;

    if (!name) return cors(error("Name is required", 400), req);

    const supabase = getSupabase();

    const { data: role, error: insertError } = await supabase
      .from("roles")
      .insert({
        name,
        description: description || null,
        restaurant_id: user.restaurantId || null,
        deleted: false,
      })
      .select("id, name, description, restaurant_id, created_at, updated_at")
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      if (insertError.code === "23505") {
        return cors(error("Role name already exists", 409), req);
      }
      return cors(error("Failed to create role", 500), req);
    }

    return cors(json({
      success: true,
      message: "Role created successfully",
      data: role,
    }), 201);

  } catch (e) {
    console.error("ROLES CREATE ERROR:", e);
    return cors(error("Internal server error", 500), req);
  }
});
