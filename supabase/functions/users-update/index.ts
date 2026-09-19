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
    const id = url.searchParams.get("id") ?? input.id ?? url.pathname.split("/").pop();
    if (!id) return cors(error("User ID is required", 400), req);

    const isAdmin = hasRole(user, "ADMIN", "SUPERADMIN");
    if (id !== user.id && !isAdmin) return cors(error("Forbidden", 403), req);

    const supabase = getSupabase();

    const { data: target } = await supabase
      .from("users")
      .select("id, restaurant_id")
      .eq("id", id)
      .eq("deleted", false)
      .maybeSingle();

    if (!target || !canAccessRestaurant(user, target.restaurant_id)) {
      return cors(error("User not found", 404, "USER_NOT_FOUND"), req);
    }

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.firstName !== undefined) updateData.first_name = String(input.firstName).trim();
    if (input.lastName !== undefined) updateData.last_name = String(input.lastName).trim();
    if (input.phone !== undefined) updateData.phone = input.phone || null;

    if (input.email !== undefined) {
      const email = String(input.email).toLowerCase().trim();
      const { data: duplicate } = await supabase
        .from("users").select("id").eq("email", email).neq("id", id).eq("deleted", false).limit(1).maybeSingle();
      if (duplicate) return cors(error("Email already exists", 409, "DUPLICATE_EMAIL"), req);
      updateData.email = email;
    }

    // Roles, verification and the password flag are admin-only.
    if (isAdmin) {
      if (input.emailVerified !== undefined) updateData.email_verified = !!input.emailVerified;
      if (input.mustChangePassword !== undefined) updateData.must_change_password = !!input.mustChangePassword;
    }

    const { error: updateError } = await supabase.from("users").update(updateData).eq("id", id);

    if (updateError) {
      console.error("Update error:", JSON.stringify(updateError));
      if (updateError.code === "23505") return cors(error("Email or phone already exists", 409), req);
      return cors(error("Failed to update user", 500), req);
    }

    if (isAdmin && Array.isArray(input.roleIds)) {
      const { data: roles } = await supabase
        .from("roles").select("id, name, restaurant_id").in("id", input.roleIds).eq("deleted", false);

      const valid = (roles || []).filter(r =>
        r.restaurant_id === target.restaurant_id && (hasRole(user, "SUPERADMIN") || r.name !== "SUPERADMIN")
      );
      if (valid.length !== input.roleIds.length) {
        return cors(error("One or more roles are invalid for this restaurant", 403), req);
      }

      const now = new Date().toISOString();
      await supabase.from("user_roles").delete().eq("user_id", id);
      if (valid.length) {
        await supabase.from("user_roles").insert(valid.map(r => ({ user_id: id, role_id: r.id, updated_at: now })));
      }
    }

    const { data: updated } = await supabase
      .from("users").select(USER_COLUMNS).eq("id", id).single();

    return cors(json({
      success: true,
      message: "User updated successfully",
      data: deepToCamelCase(withRoles(updated)),
    }), req);

  } catch (e) {
    console.error("USER UPDATE ERROR:", e);
    return cors(error("Internal server error", 500), req);
  }
});
