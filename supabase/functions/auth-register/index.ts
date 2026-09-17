import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUserFromRequest, hasRole } from "../_shared/auth.ts";
import { hashPassword } from "../_shared/password.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function getSupabase() { return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY); }

function getOrigin(req: Request): string {
  const allowed = (Deno.env.get("ALLOWED_ORIGINS") || "").split(",").map(s => s.trim()).filter(Boolean);
  const origin = req.headers.get("Origin") || "";
  if (allowed.length === 0) return "*";
  return allowed.includes(origin) ? origin : allowed[0];
}

function cors(res: Response, req: Request): Response {
  const h = new Headers(res.headers);
  h.set("Access-Control-Allow-Origin", getOrigin(req));
  h.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  h.set("Access-Control-Allow-Headers", "Content-Type, Authorization, apikey");
  h.set("Access-Control-Allow-Credentials", "true");
  return new Response(res.body, { ...res, headers: h });
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return cors(new Response(null, { status: 204 }), req);
  if (req.method !== "POST") return cors(json({ success: false, message: "Method not allowed" }, 405), req);

  const authUser = await getUserFromRequest(req);
  if (!authUser) return cors(json({ success: false, message: "Unauthorized" }, 401), req);
  if (!hasRole(authUser, "ADMIN", "SUPERADMIN")) {
    return cors(json({ success: false, message: "Forbidden" }, 403), req);
  }

  try {
    const { firstName, lastName, email, password, phone, roleIds, restaurantId: bodyRestaurantId } = await req.json();

    if (!firstName || !lastName || !email) {
      return cors(json({ success: false, message: "First name, last name, and email are required" }, 400), req);
    }

    if (typeof password !== "string" || password.length < 8 || password.length > 128) {
      return cors(json({ success: false, message: "Password must be 8-128 characters" }, 400), req);
    }

    if (roleIds !== undefined && (!Array.isArray(roleIds) || !roleIds.every((id: unknown) => Number.isInteger(id)))) {
      return cors(json({ success: false, message: "roleIds must be an array of integers" }, 400), req);
    }

    // ADMIN always creates users in their own restaurant; only SUPERADMIN may choose one.
    const isSuperAdmin = hasRole(authUser, "SUPERADMIN");
    const restaurantId: string | null = isSuperAdmin ? (bodyRestaurantId || authUser.restaurantId) : authUser.restaurantId;
    if (!isSuperAdmin && !restaurantId) {
      return cors(json({ success: false, message: "Restaurant context required" }, 400), req);
    }

    const supabase = getSupabase();

    const requestedRoleIds: number[] = [...new Set<number>(roleIds || [])];
    if (requestedRoleIds.length) {
      const { data: roles, error: rolesErr } = await supabase
        .from("roles")
        .select("id, name, restaurant_id")
        .in("id", requestedRoleIds)
        .eq("deleted", false);

      if (rolesErr) {
        console.error("ROLES LOOKUP ERROR:", JSON.stringify(rolesErr));
        return cors(json({ success: false, message: "Failed to validate roles" }, 500), req);
      }

      const allowed = (roles || []).filter(r => r.restaurant_id === restaurantId && (isSuperAdmin || r.name !== "SUPERADMIN"));
      if (allowed.length !== requestedRoleIds.length) {
        return cors(json({ success: false, message: "One or more roles are invalid for this restaurant" }, 403), req);
      }
    }

    const normalizedEmail = email.toLowerCase().trim();

    const { data: existing } = await supabase.from("users").select("id").eq("email", normalizedEmail).eq("deleted", false).maybeSingle();
    if (existing) return cors(json({ success: false, message: "Email already exists" }, 409), req);

    if (phone) {
      const { data: ep } = await supabase.from("users").select("id").eq("phone", phone).eq("deleted", false).maybeSingle();
      if (ep) return cors(json({ success: false, message: "Phone number already exists" }, 409), req);
    }

    const now = new Date().toISOString();
    const { data: newUser, error: createErr } = await supabase
      .from("users")
      .insert({ first_name: firstName.trim(), last_name: lastName.trim(), email: normalizedEmail, password: await hashPassword(password), phone: phone || null, restaurant_id: restaurantId, must_change_password: true, email_verified: false, updated_at: now })
      .select("id, email, first_name, last_name")
      .single();

    if (createErr) {
      console.error("CREATE USER ERROR:", JSON.stringify(createErr));
      return cors(json({ success: false, message: "Failed to create user" }, 500), req);
    }

    if (requestedRoleIds.length) {
      const { error: roleErr } = await supabase
        .from("user_roles")
        .insert(requestedRoleIds.map(roleId => ({ role_id: roleId, user_id: newUser.id, updated_at: now })));

      if (roleErr) {
        console.error("ASSIGN ROLES ERROR:", JSON.stringify(roleErr));
        // Don't leave a user without the roles the admin asked for.
        await supabase.from("users").delete().eq("id", newUser.id);
        return cors(json({ success: false, message: "Failed to assign roles" }, 500), req);
      }
    }

    return cors(json({ success: true, message: "User created successfully", data: { id: newUser.id, email: newUser.email, firstName: newUser.first_name, lastName: newUser.last_name, restaurantId, emailVerified: false } }, 201), req);

  } catch (e) {
    console.error("REGISTER ERROR:", e);
    return cors(json({ success: false, message: "Internal server error" }, 500), req);
  }
});
