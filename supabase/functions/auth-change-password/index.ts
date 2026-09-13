import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import bcryptjs from "https://esm.sh/bcryptjs@2.4.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function getSupabase() { return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY); }

function cors(res: Response): Response {
  const h = new Headers(res.headers);
  h.set("Access-Control-Allow-Origin", Deno.env.get("ALLOWED_ORIGINS") || "*");
  h.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  h.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  h.set("Access-Control-Allow-Credentials", "true");
  return new Response(res.body, { ...res, headers: h });
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return cors(new Response(null, { status: 204 }));
  if (req.method !== "POST") return cors(json({ success: false, message: "Method not allowed" }, 405));

  try {
    const authHeader = req.headers.get("Authorization");
    const cookieHeader = req.headers.get("Cookie");
    let token = "";
    if (authHeader?.startsWith("Bearer ")) token = authHeader.substring(7);
    else if (cookieHeader) { const c = Object.fromEntries(cookieHeader.split("; ").map(x => x.split("="))); token = c.accessToken || ""; }

    if (!token) return cors(json({ success: false, message: "Authentication required" }, 401));

    let userId = "";
    try { const p = JSON.parse(atob(token.split(".")[1])); userId = p.sub; } catch { return cors(json({ success: false, message: "Invalid token" }, 401)); }
    if (!userId) return cors(json({ success: false, message: "Invalid token" }, 401));

    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) return cors(json({ success: false, message: "Current and new password required" }, 400));
    if (newPassword.length < 8 || newPassword.length > 128) return cors(json({ success: false, message: "Password must be 8-128 characters" }, 400));
    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword) || !/[!@#$%^&*(),.?":{}|<>]/.test(newPassword))
      return cors(json({ success: false, message: "Password must contain uppercase, lowercase, number, and special character" }, 400));
    if (currentPassword === newPassword) return cors(json({ success: false, message: "New password must be different" }, 400));

    const supabase = getSupabase();
    const { data: user, error: ue } = await supabase.from("users").select("id, password").eq("id", userId).eq("deleted", false).single();
    if (ue || !user) return cors(json({ success: false, message: "User not found" }, 404));

    const valid = await bcryptjs.compare(currentPassword, user.password);
    if (!valid) return cors(json({ success: false, message: "Current password is incorrect" }, 400));

    const newHash = await bcryptjs.hash(newPassword, 10);
    await supabase.from("users").update({ password: newHash, password_changed_at: new Date().toISOString(), must_change_password: false }).eq("id", userId);
    await supabase.from("tokens").update({ blacklisted: true }).eq("userId", userId).eq("blacklisted", false);

    const resp = json({ success: true, message: "Password changed successfully. Please login again." });
    const h = new Headers(resp.headers);
    h.append("Set-Cookie", "accessToken=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
    h.append("Set-Cookie", "refreshToken=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
    return new Response(resp.body, { ...resp, headers: h });

  } catch (e) {
    console.error("CHANGE PASSWORD ERROR:", e);
    return cors(json({ success: false, message: "Internal server error", detail: String(e) }, 500));
  }
});
