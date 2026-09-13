import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const JWT_SECRET = Deno.env.get("JWT_SECRET")!;

export function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

export async function verifyJwt(token: string): Promise<Record<string, unknown> | null> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(JWT_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const [headerB64, bodyB64, sigB64] = token.split(".");
    const data = `${headerB64}.${bodyB64}`;

    const sigBytes = Uint8Array.from(atob(sigB64.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify("HMAC", key, sigBytes, encoder.encode(data));

    if (!valid) return null;

    const payload = JSON.parse(atob(bodyB64.replace(/-/g, "+").replace(/_/g, "/")));

    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function getUserFromRequest(req: Request): { id: string; restaurantId: string | null; user_role: string } | null {
  const authHeader = req.headers.get("Authorization");
  const cookieHeader = req.headers.get("Cookie");

  let token = "";
  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  } else if (cookieHeader) {
    const cookies = Object.fromEntries(cookieHeader.split("; ").map(c => c.split("=")));
    token = cookies.accessToken || "";
  }

  if (!token) return null;

  const payload = JSON.parse(atob(token.split(".")[1]));
  return {
    id: payload.sub,
    restaurantId: payload.restaurantId || null,
    user_role: payload.user_role,
  };
}

export function cors(res: Response): Response {
  const h = new Headers(res.headers);
  h.set("Access-Control-Allow-Origin", Deno.env.get("ALLOWED_ORIGINS") || "*");
  h.set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  h.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  h.set("Access-Control-Allow-Credentials", "true");
  return new Response(res.body, { ...res, headers: h });
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function error(message: string, status = 400, code?: string): Response {
  return json({ success: false, message, code }, status);
}
