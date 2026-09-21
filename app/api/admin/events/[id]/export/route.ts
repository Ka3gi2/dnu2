import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { buildWorkbook, xlsxResponse } from "@/lib/excel";

const STAFF = ["super_admin", "president", "event_manager", "committee_head", "volunteer"];

const STATUS_AR: Record<string, string> = {
  registered: "مسجل",
  attended: "حضر",
  cancelled: "ملغي",
  waitlist: "انتظار",
};

// GET: download event registrations as Excel.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession(STAFF);
    const { id } = await params;
    const db = createServiceClient();

    const { data: ev } = await db.from("events").select("id,title").eq("id", id).maybeSingle();
    if (!ev) return NextResponse.json({ error: "الفعالية غير موجودة." }, { status: 404 });

    const { data: regs, error } = await db
      .from("event_registrations")
      .select("status,registered_at,attended_at,check_in_method,students(full_name,student_code,phone,faculties(name),departments(name))")
      .eq("event_id", id)
      .order("registered_at")
      .limit(5000);
    if (error) throw error;

    const rows = (regs ?? []).map((r) => {
      const s = r.students as unknown as {
        full_name: string; student_code: string; phone: string;
        faculties: { name: string } | null; departments: { name: string } | null;
      } | null;
      return [
        s?.full_name ?? "—",
        s?.student_code ?? "—",
        s?.phone ?? "—",
        s?.faculties?.name ?? "—",
        s?.departments?.name ?? "—",
        STATUS_AR[r.status] ?? r.status,
        r.registered_at ? new Date(r.registered_at).toLocaleString("ar") : "—",
        r.attended_at ? new Date(r.attended_at).toLocaleString("ar") : "—",
        r.check_in_method === "qr" ? "QR" : r.check_in_method === "manual" ? "يدوي" : "—",
      ];
    });

    const buf = buildWorkbook(
      ["الاسم", "الكود", "الهاتف", "الكلية", "التخصص", "الحالة", "وقت التسجيل", "وقت الحضور", "طريقة الحضور"],
      rows,
    );
    return xlsxResponse(buf, `event-${id.slice(0, 8)}.xlsx`);
  } catch (e: unknown) {
    const status = (e as { status?: number })?.status ?? 500;
    return NextResponse.json({ error: e instanceof Error ? e.message : "خطأ غير متوقع." }, { status });
  }
}
