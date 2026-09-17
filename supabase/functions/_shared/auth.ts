import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const JWT_SECRET = Deno.env.get("JWT_SECRET")!;

export function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

export interface AuthUser {
  id: string;
  restaurantId: string | null;
  user_role: string;
}

function base64UrlDecode(input: string): Uint8Array<ArrayBuffer> {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
}

let hmacKey: Promise<CryptoKey> | null = null;

function getHmacKey(): Promise<CryptoKey> {
  if (!JWT_SECRET) throw new Error("JWT_SECRET is not configured");
  hmacKey ??= crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  return hmacKey;
}

export async function verifyJwt(token: string): Promise<Record<string, unknown> | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [headerB64, bodyB64, sigB64] = parts;

    const decoder = new TextDecoder();
    const header = JSON.parse(decoder.decode(base64UrlDecode(headerB64)));
    if (header.alg !== "HS256") return null;

    const valid = await crypto.subtle.verify(
      "HMAC",
      await getHmacKey(),
      base64UrlDecode(sigB64),
      new TextEncoder().encode(`${headerB64}.${bodyB64}`)
    );
    if (!valid) return null;

    const payload = JSON.parse(decoder.decode(base64UrlDecode(bodyB64)));

    if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch (e) {
    if (e instanceof Error && e.message === "JWT_SECRET is not configured") console.error(e.message);
    return null;
  }
}

function getTokenFromRequest(req: Request): string {
  const authHeader = req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) return authHeader.substring(7);

  const cookieHeader = req.headers.get("Cookie");
  if (!cookieHeader) return "";
  for (const cookie of cookieHeader.split(";")) {
    const [name, ...rest] = cookie.trim().split("=");
    if (name === "accessToken") return rest.join("=");
  }
  return "";
}

/** Returns the caller only if the access token has a valid signature and is not expired. */
export async function getUserFromRequest(req: Request): Promise<AuthUser | null> {
  const token = getTokenFromRequest(req);
  if (!token) return null;

  const payload = await verifyJwt(token);
  if (!payload || typeof payload.sub !== "string") return null;
  // Refresh tokens are signed with the same secret; they must not work as access tokens.
  if (payload.type === "REFRESH") return null;

  return {
    id: payload.sub,
    restaurantId: typeof payload.restaurantId === "string" ? payload.restaurantId : null,
    user_role: typeof payload.user_role === "string" ? payload.user_role : "",
  };
}

export function hasRole(user: AuthUser, ...roles: string[]): boolean {
  return roles.includes(user.user_role);
}

export function cors(res: Response, req?: Request): Response {
  const h = new Headers(res.headers);
  const allowed = (Deno.env.get("ALLOWED_ORIGINS") || "").split(",").map(s => s.trim()).filter(Boolean);
  const origin = req?.headers.get("Origin") || "";
  const allowOrigin = allowed.length > 0 && allowed.includes(origin) ? origin : (allowed[0] || "*");
  h.set("Access-Control-Allow-Origin", allowOrigin);
  h.set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  h.set("Access-Control-Allow-Headers", "Content-Type, Authorization, apikey");
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

function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

export function deepToCamelCase(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map(item => deepToCamelCase(item));
  }
  if (obj !== null && typeof obj === "object" && !(obj instanceof Date)) {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([key, value]) => [
        toCamelCase(key),
        deepToCamelCase(value),
      ])
    );
  }
  return obj;
}
