import * as jose from "jose";

// Edge-safe (middleware): jose only — no bcrypt, no next/headers.
export interface Session {
  uid: string;
  role: string;
}

export const SESSION_COOKIE = "dnu_session";

export async function verifySessionToken(token: string): Promise<Session | null> {
  const s = process.env.AUTH_SECRET;
  if (!s) return null;
  try {
    const { payload } = await jose.jwtVerify(token, new TextEncoder().encode(s));
    if (typeof payload.uid !== "string" || typeof payload.role !== "string") return null;
    return { uid: payload.uid, role: payload.role };
  } catch {
    return null;
  }
}
