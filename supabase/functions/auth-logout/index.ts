import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUserFromRequest, cors, json, error } from "../_shared/auth.ts";
import { clearedSessionCookies } from "../_shared/jwt.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

/** Burns the tokens the client hands back, so a stolen refresh token dies with the session. */
Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return cors(new Response(null, { status: 204 }), req);
  if (req.method !== "POST") return cors(error("Method not allowed", 405), req);

  const user = await getUserFromRequest(req);
  if (!user) return cors(error("Unauthorized", 401), req);

  try {
    const body = await req.json().catch(() => ({}));
    const authHeader = req.headers.get("Authorization");
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : "";

    const tokens = [accessToken, body.refreshToken].filter(
      (t): t is string => typeof t === "string" && t.length > 0,
    );

    const supabase = getSupabase();
    const { error: txError } = await supabase.rpc("blacklist_tokens_tx", {
      p_user_id: user.id,
      p_tokens: tokens,
      // `allDevices: true` closes every session of the user.
      p_all: body.allDevices === true,
    });

    if (txError) {
      console.error("LOGOUT ERROR:", JSON.stringify(txError));
      return cors(error("Failed to close the session", 500), req);
    }

    const resp = cors(json({ success: true, message: "Session closed", data: null }), req);
    const headers = new Headers(resp.headers);
    for (const cookie of clearedSessionCookies()) headers.append("Set-Cookie", cookie);
    return new Response(resp.body, { status: resp.status, headers });

  } catch (e) {
    console.error("LOGOUT ERROR:", e);
    return cors(error("Internal server error", 500), req);
  }
});
