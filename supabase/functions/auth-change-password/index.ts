import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  h.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  h.set("Access-Control-Allow-Headers", "Content-Type, Authorization, apikey");
  h.set("Access-Control-Allow-Credentials", "true");
  return new Response(res.body, { ...res, headers: h });
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const hash = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, key, 256);
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  const hashHex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `pbkdf2:100000:${saltHex}:${hashHex}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (stored.startsWith("$2b$") || stored.startsWith("$2a$")) return false;
  const parts = stored.split(":");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iterations = parseInt(parts[1]);
  const salt = new Uint8Array(parts[2].match(/.{2}/g)!.map(h => parseInt(h, 16)));
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const hash = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations, hash: "SHA-256" }, key, 256);
  const hashHex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex === parts[3];
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return cors(new Response(null, { status: 204 }), req);
  if (req.method !== "POST") return cors(json({ success: false, message: "Method not allowed" }, 405), req);

  try {
    const authHeader = req.headers.get("Authorization");
    let token = "";
    if (authHeader?.startsWith("Bearer ")) token = authHeader.substring(7);

    if (!token) return cors(json({ success: false, message: "Authentication required" }, 401), req);

    let userId = "";
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      userId = payload.sub;
    } catch {
      return cors(json({ success: false, message: "Invalid token" }, 401), req);
    }
    if (!userId) return cors(json({ success: false, message: "Invalid token" }, 401), req);

    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return cors(json({ success: false, message: "Current and new password required" }, 400), req);
    }
    if (newPassword.length < 8 || newPassword.length > 128) {
      return cors(json({ success: false, message: "Password must be 8-128 characters" }, 400), req);
    }
    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword) || !/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
      return cors(json({ success: false, message: "Password must contain uppercase, lowercase, number, and special character" }, 400), req);
    }
    if (currentPassword === newPassword) {
      return cors(json({ success: false, message: "New password must be different" }, 400), req);
    }

    const supabase = getSupabase();
    const { data: user, error: ue } = await supabase
      .from("users").select("id, password").eq("id", userId).eq("deleted", false).single();

    if (ue || !user) return cors(json({ success: false, message: "User not found" }, 404), req);

    const valid = await verifyPassword(currentPassword, user.password);
    if (!valid) return cors(json({ success: false, message: "Current password is incorrect" }, 400), req);

    const newHash = await hashPassword(newPassword);
    await supabase.from("users").update({
      password: newHash,
      password_changed_at: new Date().toISOString(),
      must_change_password: false,
      updated_at: new Date().toISOString(),
    }).eq("id", userId);

    return cors(json({ success: true, message: "Password changed successfully. Please login again." }), req);

  } catch (e) {
    console.error("CHANGE PASSWORD ERROR:", e);
    return cors(json({ success: false, message: "Internal server error" }, 500), req);
  }
});
