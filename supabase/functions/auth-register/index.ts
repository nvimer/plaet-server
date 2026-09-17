import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import bcryptjs from "npm:bcryptjs@2.4.3";

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

  try {
    const { firstName, lastName, email, password, phone, roleIds } = await req.json();

    if (!firstName || !lastName || !email) {
      return cors(json({ success: false, message: "First name, last name, and email are required" }, 400), req);
    }

    if (password && password.length < 8) {
      return cors(json({ success: false, message: "Password must be at least 8 characters" }, 400), req);
    }

    const supabase = getSupabase();

    const { data: existing } = await supabase.from("users").select("id").eq("email", email.toLowerCase().trim()).eq("deleted", false).single();
    if (existing) return cors(json({ success: false, message: "Email already exists" }, 409), req);

    if (phone) {
      const { data: ep } = await supabase.from("users").select("id").eq("phone", phone).eq("deleted", false).single();
      if (ep) return cors(json({ success: false, message: "Phone number already exists" }, 409), req);
    }

    const hashedPassword = password ? await bcryptjs.hash(password, 10) : "";

    const { data: newUser, error: createErr } = await supabase
      .from("users")
      .insert({ first_name: firstName.trim(), last_name: lastName.trim(), email: email.toLowerCase().trim(), password: hashedPassword, phone: phone || null, must_change_password: true, email_verified: false, updated_at: new Date().toISOString() })
      .select("id, email, first_name, last_name")
      .single();

    if (createErr) {
      console.error("CREATE USER ERROR:", JSON.stringify(createErr));
      return cors(json({ success: false, message: "Failed to create user", detail: createErr.message }, 500), req);
    }

    if (roleIds?.length) {
      await supabase.from("user_roles").insert(roleIds.map((roleId: number) => ({ role_id: roleId, user_id: newUser.id })));
    }

    return cors(json({ success: true, message: "User created successfully", data: { id: newUser.id, email: newUser.email, firstName: newUser.first_name, lastName: newUser.last_name, emailVerified: false } }, 201), req);

  } catch (e) {
    console.error("REGISTER ERROR:", e);
    return cors(json({ success: false, message: "Internal server error", detail: String(e) }, 500), req);
  }
});
