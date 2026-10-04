import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  hashPassword,
  makeStudentCode,
  normalizePhone,
  setSessionCookie,
  signSession,
  validatePassword,
} from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const full_name = String(body.full_name ?? "").trim();
    if (!full_name) {
      return NextResponse.json({ error: "الاسم مطلوب." }, { status: 400 });
    }
    const phone = normalizePhone(String(body.phone ?? ""));
    validatePassword(String(body.password ?? ""));
    const faculty_id = String(body.faculty_id ?? "");
    const department_id = String(body.department_id ?? "");
    const academic_year = String(body.academic_year ?? "");
    if (!academic_year) {
      return NextResponse.json({ error: "اختر السنة الدراسية." }, { status: 400 });
    }
    if (!faculty_id) {
      return NextResponse.json({ error: "اختر الكلية." }, { status: 400 });
    }
    if (!department_id) {
      return NextResponse.json({ error: "اختر القسم / التخصص." }, { status: 400 });
    }

    const db = createServiceClient();

    const { data: fac } = await db
      .from("faculties")
      .select("id")
      .eq("id", faculty_id)
      .eq("is_active", true)
      .maybeSingle();
    if (!fac) {
      return NextResponse.json({ error: "الكلية غير متاحة." }, { status: 400 });
    }
    const { data: dep } = await db
      .from("departments")
      .select("id,faculty_id")
      .eq("id", department_id)
      .eq("is_active", true)
      .maybeSingle();
    if (!dep || dep.faculty_id !== faculty_id) {
      return NextResponse.json({ error: "القسم لا يتبع الكلية المختارة." }, { status: 400 });
    }

    const { data: existing } = await db
      .from("students")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ error: "الرقم ده مسجل بالفعل — ادخل بالتليفون والباسورد." }, { status: 409 });
    }

    // unique student_code (retry on rare collision)
    let student = null;
    for (let i = 0; i < 5 && !student; i++) {
      const { data, error } = await db
        .from("students")
        .insert({
          student_code: makeStudentCode(),
          full_name,
          phone,
          faculty_id,
          department_id,
          academic_year,
          email: body.email ? String(body.email).trim() : null,
          gender: body.gender || null,
          birth_date: body.birth_date || null,
          interests: Array.isArray(body.interests) ? body.interests : [],
          enrollment_year: body.enrollment_year ? Number(body.enrollment_year) : null,
          level: body.level ? Number(body.level) : null,
          student_status: body.student_status || "current",
        })
        .select("id")
        .single();
      if (!error) student = data;
      else if (!String(error.message).includes("student_code")) throw error;
    }
    if (!student) throw new Error("تعذر إنشاء الحساب — حاول تاني.");

    const password_hash = await hashPassword(String(body.password));
    const { data: user, error: uErr } = await db
      .from("users")
      .insert({ student_id: student.id, phone, password_hash, role: "student" })
      .select("id,role")
      .single();
    if (uErr) throw uErr;

    await db.from("student_stats").insert({ student_id: student.id });

    await setSessionCookie(await signSession({ uid: user.id, role: user.role }));
    return NextResponse.json({ ok: true, role: user.role, student_id: student.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "تعذر التسجيل.";
    const status = /مسجل بالفعل/.test(message) ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
