import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// Public: get student info by QR token (for scanner display)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  if (!token) return NextResponse.json({ error: "token مطلوب." }, { status: 400 });
  const db = createServiceClient();
  const { data: student } = await db
    .from("students")
    .select("id,full_name,student_code,phone,faculty_id,department_id,faculties(name),departments(name)")
    .eq("qr_token", token)
    .maybeSingle();
  if (!student) return NextResponse.json({ error: "طالب غير موجود." }, { status: 404 });
  return NextResponse.json({ student });
}
