import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUserFromRequest, canAccessRestaurant, hasRole, cors, json, error, deepToCamelCase } from "../_shared/auth.ts";
import { USER_COLUMNS, withRoles } from "../_shared/users.ts";

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
    const input = await req.json();
    const userId = url.searchParams.get("id") ?? input.userId ?? user.id;

    if (userId !== user.id && !hasRole(user, "ADMIN", "SUPERADMIN")) {
      return cors(error("Forbidden", 403), req);
    }

    const supabase = getSupabase();

    const { data: target } = await supabase
      .from("users")
      .select("id, restaurant_id")
      .eq("id", userId)
      .eq("deleted", false)
      .maybeSingle();

    if (!target || !canAccessRestaurant(user, target.restaurant_id)) {
      return cors(error("User not found", 404, "USER_NOT_FOUND"), req);
    }

    const profileData: Record<string, unknown> = {};
    if (input.photoUrl !== undefined) profileData.photo_url = input.photoUrl;
    if (input.birthDate !== undefined) profileData.birthDate = input.birthDate;
    if (input.identification !== undefined) profileData.identification = input.identification;
    if (input.address !== undefined) profileData.address = input.address;

    if (Object.keys(profileData).length === 0) {
      return cors(error("No fields to update", 400), req);
    }

    const now = new Date().toISOString();
    const { data: existing } = await supabase
      .from("profiles").select("id").eq("user_id", userId).eq("deleted", false).maybeSingle();

    const { error: writeError } = existing
      ? await supabase.from("profiles").update({ ...profileData, updated_at: now }).eq("id", existing.id)
      : await supabase.from("profiles").insert({ ...profileData, user_id: userId, updated_at: now });

    if (writeError) {
      console.error("Profile write error:", JSON.stringify(writeError));
      return cors(error("Failed to update profile", 500), req);
    }

    const { data: updated } = await supabase
      .from("users").select(USER_COLUMNS).eq("id", userId).single();

    return cors(json({
      success: true,
      message: "Profile updated successfully",
      data: deepToCamelCase(withRoles(updated)),
    }), req);

  } catch (e) {
    console.error("PROFILE UPDATE ERROR:", e);
    return cors(error("Internal server error", 500), req);
  }
});
