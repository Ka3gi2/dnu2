import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  normalizePhone,
  setSessionCookie,
  signSession,
  verifyPassword,
} from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const phone = normalizePhone(String(body.phone ?? ""));
    const password = String(body.password ?? "");
    if (!password) {
      return NextResponse.json({ error: "كلمة السر مطلوبة." }, { status: 400 });
    }

    const db = createServiceClient();
    const { data: user } = await db
      .from("users")
      .select("id,role,password_hash,is_active")
      .eq("phone", phone)
      .maybeSingle();

    if (!user || user.is_active === false) {
      return NextResponse.json({ error: "بيانات الدخول غير صحيحة." }, { status: 401 });
    }
    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) {
      return NextResponse.json({ error: "بيانات الدخول غير صحيحة." }, { status: 401 });
    }

    await setSessionCookie(await signSession({ uid: user.id, role: user.role }));
    return NextResponse.json({ ok: true, role: user.role });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "تعذر الدخول." },
      { status: 400 }
    );
  }
}
