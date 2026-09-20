import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyJwt, cors, json, error } from "../_shared/auth.ts";
import { issueTokenPair, sessionCookies } from "../_shared/jwt.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

function getRefreshToken(req: Request, body: Record<string, unknown>): string {
  if (typeof body.refreshToken === "string" && body.refreshToken) return body.refreshToken;

  const cookieHeader = req.headers.get("Cookie");
  if (!cookieHeader) return "";
  for (const cookie of cookieHeader.split(";")) {
    const [name, ...rest] = cookie.trim().split("=");
    if (name === "refreshToken") return rest.join("=");
  }
  return "";
}

/**
 * Trades a refresh token for a new pair. The old one is burned in the same
 * transaction, so presenting it twice ends every session of that user.
 */
Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return cors(new Response(null, { status: 204 }), req);
  if (req.method !== "POST") return cors(error("Method not allowed", 405), req);

  try {
    const body = await req.json().catch(() => ({}));
    const token = getRefreshToken(req, body);

    if (!token) return cors(error("Refresh token required", 401, "REFRESH_TOKEN_REQUIRED"), req);

    const payload = await verifyJwt(token);
    if (!payload || payload.type !== "REFRESH" || typeof payload.sub !== "string") {
      return cors(error("Invalid refresh token", 401, "REFRESH_TOKEN_INVALID"), req);
    }

    const supabase = getSupabase();

    // Role and restaurant come from the database, not from the old token: a user
    // moved to another restaurant should not keep the old claims for a week.
    const { data: user } = await supabase
      .from("users")
      .select("id, email, first_name, last_name, must_change_password, restaurant_id")
      .eq("id", payload.sub)
      .eq("deleted", false)
      .maybeSingle();

    if (!user) return cors(error("Invalid refresh token", 401, "REFRESH_TOKEN_INVALID"), req);

    const { data: userRole } = await supabase
      .from("user_roles")
      .select("role:roles(name, restaurant_id)")
      .eq("user_id", user.id)
      .eq("deleted", false)
      .limit(1)
      .maybeSingle();

    const role = userRole?.role as { name: string; restaurant_id: string } | undefined;
    const restaurantId = role?.restaurant_id || user.restaurant_id;
    const roleName = role?.name || "USER";

    const pair = await issueTokenPair({
      sub: user.id,
      restaurantId: restaurantId || null,
      user_role: roleName,
    });

    const { data: status, error: txError } = await supabase.rpc("rotate_refresh_token_tx", {
      p_old_token: token,
      p_user_id: user.id,
      p_new_access: pair.accessToken,
      p_new_refresh: pair.refreshToken,
      p_access_expires: pair.accessExpires,
      p_refresh_expires: pair.refreshExpires,
    });

    if (txError) {
      console.error("ROTATE TOKEN TX ERROR:", JSON.stringify(txError));
      return cors(error("Failed to refresh the session", 500), req);
    }

    if (status !== "OK") {
      // TOKEN_REUSED also means every session of this user was just closed.
      const message = status === "TOKEN_REUSED"
        ? "This session was closed for security reasons. Please sign in again."
        : "Invalid refresh token";
      return cors(error(message, 401, String(status)), req);
    }

    const resp = json({
      success: true,
      message: "Session refreshed",
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          mustChangePassword: user.must_change_password,
          restaurantId,
          role: roleName,
        },
        accessToken: pair.accessToken,
        refreshToken: pair.refreshToken,
      },
    });

    const withCookies = cors(resp, req);
    const headers = new Headers(withCookies.headers);
    for (const cookie of sessionCookies(pair.accessToken, pair.refreshToken)) {
      headers.append("Set-Cookie", cookie);
    }
    return new Response(withCookies.body, { status: withCookies.status, headers });

  } catch (e) {
    console.error("REFRESH TOKEN ERROR:", e);
    return cors(error("Internal server error", 500), req);
  }
});
