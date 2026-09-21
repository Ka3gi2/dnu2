import bcrypt from "bcryptjs";
import * as jose from "jose";
import { cookies } from "next/headers";

export { SESSION_COOKIE } from "./auth-edge";
import { SESSION_COOKIE } from "./auth-edge";

export function normalizePhone(raw: string): string {
  const p = raw.trim().replace(/[\s\-()]/g, "");
  const digits = p.startsWith("+") ? p.slice(1) : p;
  if (!/^\d{8,15}$/.test(digits)) {
    throw new Error("رقم الهاتف غير صحيح (لازم 8 إلى 15 رقم).");
  }
  return p;
}

export function validatePassword(pw: string) {
  if (!pw || pw.length < 6) throw new Error("كلمة السر لازم 6 حروف على الأقل.");
}

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10);
}

export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET missing — ضيفه في .env.local");
  return new TextEncoder().encode(s);
}

export async function signSession(payload: { uid: string; role: string }) {
  return new jose.SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

export async function readSession(): Promise<{ uid: string; role: string } | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jose.jwtVerify(token, secret());
    if (typeof payload.uid !== "string" || typeof payload.role !== "string") return null;
    return { uid: payload.uid, role: payload.role };
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export function makeStudentCode() {
  const y = new Date().getFullYear();
  const r = Math.floor(1000 + Math.random() * 9000);
  const extra = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `STU-${y}-${r}${extra}`;
}

// Live permissions: JWT proves identity, but role + active status
// are ALWAYS re-read from the DB — promotion/demotion/deactivation
// take effect immediately, no re-login needed.
export async function readSessionFresh(): Promise<{ uid: string; role: string } | null> {
  const s = await readSession();
  if (!s) return null;
  try {
    const { createServiceClient } = await import("./supabase/server");
    const db = createServiceClient();
    const { data } = await db.from("users").select("role,is_active").eq("id", s.uid).maybeSingle();
    if (!data || data.is_active === false) return null;
    return { uid: s.uid, role: data.role };
  } catch {
    return s; // DB hiccup → fall back to cookie so nobody gets locked out
  }
}

// Server pages / API routes: throws { status } on failure.
export async function requireSession(allowedRoles?: string[]) {
  const s = await readSessionFresh();
  if (!s) throw Object.assign(new Error("سجّل الدخول أولاً."), { status: 401 });
  if (allowedRoles && !allowedRoles.includes(s.role)) {
    throw Object.assign(new Error("غير مصرح."), { status: 403 });
  }
  return s;
}
