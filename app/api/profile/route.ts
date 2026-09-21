import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const session = await readSession();
    if (!session) return NextResponse.json({ error: "غير مصرح." }, { status: 401 });

    const db = createServiceClient();
    const { data: user } = await db.from("users").select("student_id").eq("id", session.uid).single();
    if (!user?.student_id) return NextResponse.json({ error: "لم يتم العثور على ملف الطالب." }, { status: 404 });

    const { data: student } = await db
      .from("students")
      .select("*")
      .eq("id", user.student_id)
      .single();
    if (!student) return NextResponse.json({ error: "الطالب غير موجود." }, { status: 404 });

    return NextResponse.json({ student });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "خطأ غير متوقع." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await readSession();
    if (!session) return NextResponse.json({ error: "غير مصرح." }, { status: 401 });

    const body = await req.json();
    const db = createServiceClient();

    const { data: user } = await db.from("users").select("student_id").eq("id", session.uid).single();
    if (!user?.student_id) return NextResponse.json({ error: "لم يتم العثور على ملف الطالب." }, { status: 404 });

    const updates: Record<string, unknown> = {};
    if (body.full_name !== undefined) updates.full_name = String(body.full_name).trim();
    if (body.email !== undefined) updates.email = body.email ? String(body.email).trim() : null;
    if (body.gender !== undefined) updates.gender = body.gender || null;
    if (body.birth_date !== undefined) updates.birth_date = body.birth_date || null;
    if (body.interests !== undefined) updates.interests = Array.isArray(body.interests) ? body.interests : [];
    if (body.level !== undefined) updates.level = body.level ? Number(body.level) : null;
    if (body.enrollment_year !== undefined) updates.enrollment_year = body.enrollment_year ? Number(body.enrollment_year) : null;
    if (body.student_status !== undefined) updates.student_status = body.student_status || "current";

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "لا توجد بيانات للتحديث." }, { status: 400 });
    }

    const { error } = await db.from("students").update(updates).eq("id", user.student_id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "تعذر التحديث." }, { status: 400 });
  }
}
