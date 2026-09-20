const JWT_SECRET = Deno.env.get("JWT_SECRET")!;

export const ACCESS_TOKEN_EXPIRY = 30 * 60;          // 30 minutes
export const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60; // 7 days

export interface TokenClaims {
  sub: string;
  restaurantId: string | null;
  user_role: string;
}

function base64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

let signingKey: Promise<CryptoKey> | null = null;

function getSigningKey(): Promise<CryptoKey> {
  if (!JWT_SECRET) throw new Error("JWT_SECRET is not configured");
  signingKey ??= crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return signingKey;
}

/** HS256, the same shape auth-login has always issued. */
export async function signJwt(payload: Record<string, unknown>, expiresInSec: number): Promise<string> {
  const encoder = new TextEncoder();
  const now = Math.floor(Date.now() / 1000);

  const headerB64 = base64Url(encoder.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const bodyB64 = base64Url(encoder.encode(JSON.stringify({ ...payload, iat: now, exp: now + expiresInSec })));
  const data = `${headerB64}.${bodyB64}`;

  const signature = await crypto.subtle.sign("HMAC", await getSigningKey(), encoder.encode(data));
  return `${data}.${base64Url(new Uint8Array(signature))}`;
}

/** Access + refresh for a set of claims, with the expiry dates the tokens table stores. */
export async function issueTokenPair(claims: TokenClaims) {
  const accessToken = await signJwt({ ...claims }, ACCESS_TOKEN_EXPIRY);
  const refreshToken = await signJwt({ ...claims, type: "REFRESH" }, REFRESH_TOKEN_EXPIRY);
  const now = Date.now();

  return {
    accessToken,
    refreshToken,
    accessExpires: new Date(now + ACCESS_TOKEN_EXPIRY * 1000).toISOString(),
    refreshExpires: new Date(now + REFRESH_TOKEN_EXPIRY * 1000).toISOString(),
  };
}

/** Cookies mirroring the tokens in the body, for clients that prefer them. */
export function sessionCookies(accessToken: string, refreshToken: string): string[] {
  return [
    `accessToken=${accessToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${ACCESS_TOKEN_EXPIRY}`,
    `refreshToken=${refreshToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${REFRESH_TOKEN_EXPIRY}`,
  ];
}

export function clearedSessionCookies(): string[] {
  return [
    "accessToken=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
    "refreshToken=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
  ];
}
