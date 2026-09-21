import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";

async function guard() {
  await requireSession(["super_admin", "president"]);
}

function denied(e: unknown) {
  const status = (e as { status?: number })?.status ?? 500;
  const error = e instanceof Error ? e.message : "خطأ غير متوقع.";
  return NextResponse.json({ error }, { status });
}

export async function GET(req: Request) {
  try {
    await guard();
    const { searchParams } = new URL(req.url);
    const faculty_id = searchParams.get("faculty_id");
    const db = createServiceClient();
    let q = db.from("departments").select("id,faculty_id,name,is_active").order("name");
    if (faculty_id) q = q.eq("faculty_id", faculty_id);
    const { data, error } = await q;
    if (error) throw error;
    return NextResponse.json({ departments: data });
  } catch (e) {
    return denied(e);
  }
}

export async function POST(req: Request) {
  try {
    await guard();
    const { faculty_id, name } = await req.json();
    const clean = String(name ?? "").trim();
    if (!faculty_id) return NextResponse.json({ error: "اختر الكلية." }, { status: 400 });
    if (!clean) return NextResponse.json({ error: "اسم القسم/التخصص مطلوب." }, { status: 400 });
    const db = createServiceClient();
    const { data: fac } = await db
      .from("faculties")
      .select("id")
      .eq("id", faculty_id)
      .eq("is_active", true)
      .maybeSingle();
    if (!fac) return NextResponse.json({ error: "الكلية غير موجودة أو معطلة." }, { status: 400 });
    const { data, error } = await db
      .from("departments")
      .insert({ faculty_id, name: clean })
      .select("id,faculty_id,name,is_active")
      .single();
    if (error) throw error;
    return NextResponse.json({ department: data });
  } catch (e) {
    return denied(e);
  }
}
