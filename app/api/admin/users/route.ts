import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { hashPassword, normalizePhone, requireSession, validatePassword } from "@/lib/auth";
import { ROLES } from "@/lib/roles";

async function guard() {
  return requireSession(["super_admin", "president"]);
}

function denied(e: unknown) {
  const status = (e as { status?: number })?.status ?? 500;
  const error = e instanceof Error ? e.message : "خطأ غير متوقع.";
  return NextResponse.json({ error }, { status });
}

export async function GET() {
  try {
    await guard();
    const db = createServiceClient();
    const { data, error } = await db
      .from("users")
      .select("id,phone,email,role,committee_id,is_active,created_at,students(full_name)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return NextResponse.json({ users: data });
  } catch (e) {
    return denied(e);
  }
}

export async function POST(req: Request) {
  try {
    await guard();
    const body = await req.json();
    const phone = normalizePhone(String(body.phone ?? ""));
    const password = String(body.password ?? "");
    validatePassword(password);
    const role = String(body.role ?? "");
    if (!ROLES.includes(role as never)) {
      return NextResponse.json({ error: "دور غير صحيح." }, { status: 400 });
    }
    const db = createServiceClient();
    const { data: dup } = await db.from("users").select("id").eq("phone", phone).maybeSingle();
    if (dup) return NextResponse.json({ error: "الرقم مسجل لمسؤول آخر." }, { status: 409 });

    let student_id: string | null = null;
    if (body.student_id) {
      const { data: st } = await db
        .from("students")
        .select("id")
        .eq("id", String(body.student_id))
        .maybeSingle();
      if (!st) return NextResponse.json({ error: "الطالب المرتبط غير موجود." }, { status: 400 });
      student_id = st.id;
    }

    const { data, error } = await db
      .from("users")
      .insert({
        phone,
        password_hash: await hashPassword(password),
        role,
        student_id,
        committee_id: body.committee_id || null,
      })
      .select("id,phone,role,is_active")
      .single();
    if (error) throw error;
    return NextResponse.json({ user: data });
  } catch (e) {
    return denied(e);
  }
}
