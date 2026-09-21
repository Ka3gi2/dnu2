import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "./lib/auth-edge";
import { COMMUNICATION_ROLES, ADMIN_ROLES } from "./lib/roles";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Static assets (public/ files like /events/*.jpg) must never be gated
  const lastSegment = pathname.split("/").pop() ?? "";
  if (lastSegment.includes(".")) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  // 1) Auth required
  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Live permissions: re-read role from DB (promotion/demotion is instant).
  // Falls back to the cookie role if the DB is unreachable.
  const role = await freshRole(session.uid, session.role);
  if (role === "__blocked__") {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // 2) Students: own profile only — the full list is staff-only
  if (role === "student" && pathname === "/students") {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // 3) Admin area: super_admin + president only
  if (pathname.startsWith("/admin") && !ADMIN_ROLES.includes(role as never)) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // 3) Role gate: communication center (campaigns/audience data)
  if (pathname.startsWith("/communication") && !COMMUNICATION_ROLES.includes(role as never)) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Staff-only: credential outbox (admin-created accounts)
  if (pathname.startsWith("/credentials") && !["super_admin", "president", "committee_head"].includes(role)) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Edge-safe fresh role lookup via Supabase REST (middleware can't use supabase-js cookies).
async function freshRole(uid: string, fallback: string): Promise<string> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return fallback;
    const r = await fetch(`${url}/rest/v1/users?select=role,is_active&id=eq.${uid}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!r.ok) return fallback;
    const arr = await r.json();
    const u = Array.isArray(arr) ? arr[0] : null;
    if (!u || u.is_active === false) return "__blocked__";
    return typeof u.role === "string" ? u.role : fallback;
  } catch {
    return fallback;
  }
}

export const config = {
  matcher: ["/students/:path*", "/events/:path*", "/communication/:path*", "/admin/:path*", "/credentials/:path*"],
};
