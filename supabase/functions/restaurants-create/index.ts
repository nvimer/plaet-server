import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const JWT_SECRET = Deno.env.get("JWT_SECRET")!;

function getSupabaseClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

function verifyJwt(token: string): Record<string, unknown> | null {
  try {
    const [headerB64, bodyB64, sigB64] = token.split(".");
    const payload = JSON.parse(atob(bodyB64.replace(/-/g, "+").replace(/_/g, "/")));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function getUserFromRequest(req: Request) {
  const authHeader = req.headers.get("Authorization");
  let token = "";
  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  }
  if (!token) return null;
  const payload = verifyJwt(token);
  if (!payload) return null;
  return {
    id: payload.sub as string,
    restaurantId: payload.restaurantId as string | null,
    user_role: payload.user_role as string,
  };
}

function corsHeaders(origin: string | null) {
  const allowed = (Deno.env.get("ALLOWED_ORIGINS") || "").split(",").map(s => s.trim()).filter(Boolean);
  const allowOrigin = allowed.length > 0 && origin && allowed.includes(origin) ? origin : (allowed[0] || "*");
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
  };
}

function jsonResponse(data: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

function generatePassword(length = 16): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => chars[b % chars.length]).join("");
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const hash = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, key, 256);
  const hashArray = new Uint8Array(hash);
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  const hashHex = Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('');
  return `pbkdf2:100000:${saltHex}:${hashHex}`;
}

async function sendInvitationEmail(to: string, name: string, restaurantName: string, tempPassword: string): Promise<boolean> {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
  if (!RESEND_API_KEY) {
    console.log("No RESEND_API_KEY — skipping email");
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Plaet <no-reply@plaet.cloud>",
        to: [to],
        subject: `Tu cuenta en Plaet para ${restaurantName} está lista`,
        html: `<p>Hola <strong>${name}</strong>,</p><p>Se ha creado tu cuenta en Plaet para <strong>${restaurantName}</strong>.</p><p>Email: ${to}</p><p>Contraseña temporal: <strong>${tempPassword}</strong></p><p><a href="https://plaet.cloud/login">Ir a Plaet</a></p><p>Cambia tu contraseña al iniciar sesión.</p>`,
      }),
    });
    if (!res.ok) { console.error("Resend error:", await res.text()); return false; }
    return true;
  } catch (e) { console.error("Failed to send email:", e); return false; }
}

Deno.serve(async (req: Request): Promise<Response> => {
  const origin = req.headers.get("Origin");

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (req.method !== "POST") {
    return jsonResponse({ success: false, message: "Method not allowed" }, 405, origin);
  }

  const user = getUserFromRequest(req);
  if (!user) return jsonResponse({ success: false, message: "Unauthorized" }, 401, origin);

  try {
    const body = await req.json();
    const { name, slug, address, phone, nit, currency, timezone, adminUser } = body;
    const adminEmail = body.adminEmail || adminUser?.email;
    const adminFirstName = body.adminFirstName || adminUser?.firstName;
    const adminLastName = body.adminLastName || adminUser?.lastName;

    if (!name) return jsonResponse({ success: false, message: "Name is required" }, 400, origin);

    const supabase = getSupabaseClient();
    const restaurantSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    const now = new Date().toISOString();
    const { data: restaurant, error: insertError } = await supabase
      .from("restaurants")
      .insert({
        name, slug: restaurantSlug, status: "ACTIVE",
        address: address || null, phone: phone || null, nit: nit || null,
        currency: currency || "COP", timezone: timezone || "America/Bogota",
        created_at: now, updated_at: now, deleted: false,
      })
      .select("id, name, slug, status, address, phone, nit, logo_url, currency, timezone, created_at, updated_at")
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      if (insertError.code === "23505") return jsonResponse({ success: false, message: "Restaurant slug already exists" }, 409, origin);
      return jsonResponse({ success: false, message: insertError.message }, 500, origin);
    }

    let tempPassword: string | null = null;
    let emailSent = false;

    if (adminEmail) {
      tempPassword = generatePassword();
      const passwordHash = await hashPassword(tempPassword);
      const userNow = new Date().toISOString();

      const { data: newUser, error: userError } = await supabase
        .from("users")
        .insert({
          email: adminEmail.toLowerCase().trim(),
          first_name: adminFirstName || "Admin",
          last_name: adminLastName || restaurant.name,
          password: passwordHash, must_change_password: true,
          email_verified: false, restaurant_id: restaurant.id,
          deleted: false, created_at: userNow, updated_at: userNow,
        })
        .select("id").single();

      if (userError) {
        console.error("User insert error:", userError);
        return jsonResponse({ success: false, message: "Restaurant created but failed to create admin user" }, 500, origin);
      }

      let { data: adminRole } = await supabase
        .from("roles").select("id").eq("name", "ADMIN").eq("restaurant_id", restaurant.id).single();

      if (!adminRole) {
        const roleNow = new Date().toISOString();
        const { data: newRole } = await supabase
          .from("roles").insert({
            name: "ADMIN", description: "Administrator role", restaurant_id: restaurant.id,
            created_at: roleNow, updated_at: roleNow, deleted: false,
          }).select("id").single();
        adminRole = newRole;
      }

      if (adminRole) {
        const roleNow = new Date().toISOString();
        await supabase.from("user_roles").insert({
          user_id: newUser.id, role_id: adminRole.id, deleted: false,
          created_at: roleNow, updated_at: roleNow,
        });
      }

      emailSent = await sendInvitationEmail(adminEmail, adminFirstName || "Admin", restaurant.name, tempPassword);
    }

    return jsonResponse({
      success: true, message: "Restaurant created successfully",
      data: {
        id: restaurant.id, name: restaurant.name, slug: restaurant.slug,
        status: restaurant.status, address: restaurant.address, phone: restaurant.phone,
        nit: restaurant.nit, logoUrl: restaurant.logo_url,
        currency: restaurant.currency, timezone: restaurant.timezone,
        createdAt: restaurant.created_at, updatedAt: restaurant.updated_at,
        ...(adminEmail && { adminUser: { email: adminEmail, tempPassword: emailSent ? undefined : tempPassword, emailSent } }),
      },
    }, 201, origin);

  } catch (e) {
    console.error("RESTAURANTS CREATE ERROR:", e);
    return jsonResponse({ success: false, message: e instanceof Error ? e.message : String(e) }, 500, origin);
  }
});
