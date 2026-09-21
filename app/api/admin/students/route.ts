import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { hashPassword, makeStudentCode, normalizePhone } from "@/lib/auth";

const STAFF = ["super_admin", "president", "committee_head"];

export async function GET(req: Request) {
  try {
    await requireSession(STAFF);
    const { searchParams } = new URL(req.url);
    const faculty_id = searchParams.get("faculty_id");
    const q = searchParams.get("q");
    const db = createServiceClient();
    let query = db
      .from("students")
      .select("id,student_code,full_name,academic_year,phone,faculty_id,department_id,faculties(name),departments(name)")
      .order("created_at", { ascending: false })
      .limit(100);
    if (faculty_id) query = query.eq("faculty_id", faculty_id);
    if (q) query = query.ilike("full_name", `%${q}%`);
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ students: data });
  } catch (e: unknown) {
    const status = (e as { status?: number })?.status ?? 500;
    return NextResponse.json({ error: e instanceof Error ? e.message : "خطأ غير متوقع." }, { status });
  }
}

// POST: admin adds a student directly (name + faculty + whatsapp + department).
export async function POST(req: Request) {
  try {
    await requireSession(STAFF);
    const body = await req.json();
    const full_name = String(body.full_name ?? "").trim();
    if (!full_name) return NextResponse.json({ error: "اسم الطالب مطلوب." }, { status: 400 });
    let phone: string;
    try {
      phone = normalizePhone(String(body.phone ?? ""));
    } catch {
      return NextResponse.json({ error: "رقم الواتساب غير صحيح." }, { status: 400 });
    }
    const faculty_id = String(body.faculty_id ?? "");
    const department_id = String(body.department_id ?? "");
    if (!faculty_id) return NextResponse.json({ error: "اختر الكلية." }, { status: 400 });
    if (!department_id) return NextResponse.json({ error: "اختر التخصص." }, { status: 400 });
    const academic_year = String(body.academic_year ?? "").trim() || null;
    // Default login password = phone digits (admin can override)
    const password = String(body.password ?? "").trim() || phone.replace(/\D/g, "");
    if (password.length < 6) return NextResponse.json({ error: "الباسورد 6 حروف على الأقل." }, { status: 400 });

    const db = createServiceClient();

    const { data: fac } = await db.from("faculties").select("id").eq("id", faculty_id).eq("is_active", true).maybeSingle();
    if (!fac) return NextResponse.json({ error: "الكلية غير متاحة." }, { status: 400 });
    const { data: dep } = await db.from("departments").select("id,faculty_id").eq("id", department_id).eq("is_active", true).maybeSingle();
    if (!dep || dep.faculty_id !== faculty_id) {
      return NextResponse.json({ error: "التخصص لا يتبع الكلية المختارة." }, { status: 400 });
    }
    const { data: existing } = await db.from("students").select("id").eq("phone", phone).maybeSingle();
    if (existing) return NextResponse.json({ error: "الرقم ده مسجل بالفعل." }, { status: 409 });

    let student: { id: string } | null = null;
    let student_code = "";
    for (let i = 0; i < 5 && !student; i++) {
      student_code = makeStudentCode();
      const { data, error } = await db
        .from("students")
        .insert({ student_code, full_name, phone, faculty_id, department_id, academic_year })
        .select("id")
        .single();
      if (!error) student = data;
      else if (!String(error.message).includes("student_code")) throw error;
    }
    if (!student) throw new Error("تعذر إضافة الطالب — حاول تاني.");

    const { error: uErr } = await db
      .from("users")
      .insert({ student_id: student.id, phone, password_hash: await hashPassword(password), role: "student" });
    if (uErr) throw uErr;

    await db.from("student_stats").insert({ student_id: student.id });

    // Queue login credentials to the student's WhatsApp (sent later from /credentials)
    const credMsg = `أهلاً ${full_name}\nتم إنشاء حسابك في منظومة اتحاد الطلاب - جامعة دمنهور الأهلية\nرقم الهاتف (الدخول): ${phone}\nكلمة السر: ${password}`;
    await db.from("credential_outbox").insert({ student_id: student.id, phone, message: credMsg });

    return NextResponse.json({ ok: true, student_id: student.id, student_code, phone, password });
  } catch (e: unknown) {
    const status = (e as { status?: number })?.status ?? 500;
    return NextResponse.json({ error: e instanceof Error ? e.message : "خطأ غير متوقع." }, { status });
  }
}

// DELETE: remove a student account entirely (login + profile; the rest cascades).
export async function DELETE(req: Request) {
  try {
    await requireSession(STAFF);
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "حدد الطالب." }, { status: 400 });
    const db = createServiceClient();
    const { data: target } = await db.from("students").select("id,full_name").eq("id", id).maybeSingle();
    if (!target) return NextResponse.json({ error: "الطالب غير موجود." }, { status: 404 });
    // login account first (its FK is set-null, so it would otherwise stay orphaned)
    await db.from("users").delete().eq("student_id", id);
    const { error } = await db.from("students").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const status = (e as { status?: number })?.status ?? 500;
    return NextResponse.json({ error: e instanceof Error ? e.message : "خطأ غير متوقع." }, { status });
  }
}
