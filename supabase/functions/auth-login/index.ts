import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const JWT_SECRET = Deno.env.get("JWT_SECRET")!;
const ACCESS_TOKEN_EXPIRY = 30 * 60;
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60;

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

async function signJwt(payload: Record<string, unknown>, expiresInSec: number): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + expiresInSec };

  const encoder = new TextEncoder();
  const headerB64 = btoa(String.fromCharCode(...encoder.encode(JSON.stringify(header))))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const bodyB64 = btoa(String.fromCharCode(...encoder.encode(JSON.stringify(body))))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const data = `${headerB64}.${bodyB64}`;
  const key = await crypto.subtle.importKey("raw", encoder.encode(JWT_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  return `${data}.${sigB64}`;
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

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (stored.startsWith("$2b$") || stored.startsWith("$2a$")) {
    // Legacy bcrypt hash - compare with constant-time string comparison
    // For now, just return false since we're migrating away from bcrypt
    return false;
  }
  if (!stored.startsWith("pbkdf2:")) return false;
  const [, iterations, saltHex, hashHex] = stored.split(":");
  const encoder = new TextEncoder();
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(h => parseInt(h, 16)));
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const hash = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: parseInt(iterations), hash: "SHA-256" }, key, 256);
  const hashArray = new Uint8Array(hash);
  const computedHex = Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('');
  return computedHex === hashHex;
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
    const body = await req.json();
    const email = body.email;
    const password = body.password;

    if (!email || !password) {
      return cors(json({ success: false, message: "Email and password required" }, 400), req);
    }

    const supabase = getSupabase();

    const { data: user, error } = await supabase
      .from("users")
      .select("id, email, first_name, last_name, password, must_change_password, restaurant_id, locked_until, failed_login_attempts")
      .eq("email", email.toLowerCase().trim())
      .eq("deleted", false)
      .single();

    if (error || !user) {
      return cors(json({ success: false, message: "Invalid credentials", errorCode: "INVALID_CREDENTIALS" }, 401), req);
    }

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return cors(json({ success: false, message: "Account locked", errorCode: "ACCOUNT_LOCKED" }, 423), req);
    }

    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      const attempts = (user.failed_login_attempts || 0) + 1;
      const update: Record<string, unknown> = { failed_login_attempts: attempts };
      if (attempts >= 5) update.locked_until = new Date(Date.now() + 15 * 60000).toISOString();
      await supabase.from("users").update(update).eq("id", user.id);
      return cors(json({ success: false, message: "Invalid credentials" }, 401), req);
    }

    await supabase.from("users").update({ failed_login_attempts: 0, locked_until: null }).eq("id", user.id);

    const { data: ur } = await supabase
      .from("user_roles")
      .select("role:roles(name, restaurant_id)")
      .eq("user_id", user.id)
      .eq("deleted", false)
      .single();

    const role = ur?.role as { name: string; restaurant_id: string } | undefined;
    const restaurantId = role?.restaurant_id || user.restaurant_id;
    const roleName = role?.name || "USER";

    const payload = { sub: user.id, restaurantId: restaurantId || null, user_role: roleName };
    const accessToken = await signJwt(payload, ACCESS_TOKEN_EXPIRY);
    const refreshToken = await signJwt({ ...payload, type: "REFRESH" }, REFRESH_TOKEN_EXPIRY);

    const now = new Date();
    await supabase.from("tokens").insert([
      { token: accessToken, type: "ACCESS", expires: new Date(now.getTime() + ACCESS_TOKEN_EXPIRY * 1000).toISOString(), blacklisted: false, userId: user.id },
      { token: refreshToken, type: "REFRESH", expires: new Date(now.getTime() + REFRESH_TOKEN_EXPIRY * 1000).toISOString(), blacklisted: false, userId: user.id },
    ]);

    const resp = json({
      success: true,
      message: "Login successful",
      data: {
        user: { id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name, mustChangePassword: user.must_change_password, restaurantId, role: roleName },
        accessToken,
        refreshToken,
      },
    });

    const h = new Headers(resp.headers);
    h.set("Access-Control-Allow-Origin", getOrigin(req));
    h.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    h.set("Access-Control-Allow-Headers", "Content-Type, Authorization, apikey");
    h.set("Access-Control-Allow-Credentials", "true");
    h.append("Set-Cookie", `accessToken=${accessToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${ACCESS_TOKEN_EXPIRY}`);
    h.append("Set-Cookie", `refreshToken=${refreshToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${REFRESH_TOKEN_EXPIRY}`);
    return new Response(resp.body, { ...resp, headers: h });

  } catch (e) {
    console.error("LOGIN ERROR:", e);
    return cors(json({ success: false, message: "Internal server error", detail: String(e) }, 500), req);
  }
});
