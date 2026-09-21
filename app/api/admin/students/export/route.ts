import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { buildWorkbook, xlsxResponse } from "@/lib/excel";

const STAFF = ["super_admin", "president", "committee_head"];

// GET: download students as Excel (respects ?q=&faculty_id= filters).
export async function GET(req: Request) {
  try {
    await requireSession(STAFF);
    const { searchParams } = new URL(req.url);
    const faculty_id = searchParams.get("faculty_id");
    const q = searchParams.get("q");
    const db = createServiceClient();
    let query = db
      .from("students")
      .select("student_code,full_name,phone,academic_year,status,faculties(name),departments(name)")
      .order("created_at", { ascending: false })
      .limit(5000);
    if (faculty_id) query = query.eq("faculty_id", faculty_id);
    if (q) query = query.ilike("full_name", `%${q}%`);
    const { data, error } = await query;
    if (error) throw error;

    const STATUS_AR: Record<string, string> = { active: "نشط", inactive: "موقوف", graduated: "خريج" };
    const rows = (data ?? []).map((s) => [
      s.full_name,
      s.student_code,
      s.phone,
      (s.faculties as unknown as { name: string } | null)?.name ?? "—",
      (s.departments as unknown as { name: string } | null)?.name ?? "—",
      s.academic_year ?? "—",
      STATUS_AR[s.status] ?? s.status,
    ]);

    const buf = buildWorkbook(
      ["الاسم", "الكود", "الهاتف", "الكلية", "التخصص", "السنة الدراسية", "الحالة"],
      rows,
    );
    return xlsxResponse(buf, "students.xlsx");
  } catch (e: unknown) {
    const status = (e as { status?: number })?.status ?? 500;
    return NextResponse.json({ error: e instanceof Error ? e.message : "خطأ غير متوقع." }, { status });
  }
}
