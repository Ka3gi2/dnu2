import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { buildWorkbook, xlsxResponse } from "@/lib/excel";

const COMM = ["super_admin", "president", "communication_manager", "committee_head"];

function renderTpl(
  body: string,
  s: { full_name: string; phone: string; student_code: string; faculties: { name: string } | null; departments: { name: string } | null },
): string {
  return body
    .replaceAll("{{name}}", s.full_name ?? "")
    .replaceAll("{{code}}", s.student_code ?? "")
    .replaceAll("{{phone}}", s.phone ?? "")
    .replaceAll("{{faculty}}", s.faculties?.name ?? "")
    .replaceAll("{{department}}", s.departments?.name ?? "");
}

const STATUS_AR: Record<string, string> = {
  queued: "منتظر",
  sent: "تم الإرسال",
  delivered: "تم التوصيل",
  failed: "فشل",
};

// GET: download campaign recipients as Excel — each row with the final
// rendered message from the campaign template.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession(COMM);
    const { id } = await params;
    const db = createServiceClient();

    const { data: camp, error: cErr } = await db
      .from("campaigns")
      .select("id,title,message_templates(body)")
      .eq("id", id)
      .single();
    if (cErr || !camp) return NextResponse.json({ error: "الحملة غير موجودة." }, { status: 404 });

    const tpl = Array.isArray(camp.message_templates) ? camp.message_templates[0] : camp.message_templates;
    const body = (tpl as { body?: string } | null)?.body ?? "";

    const { data: recips, error: rErr } = await db
      .from("campaign_recipients")
      .select("status,sent_at,students(full_name,student_code,phone,faculties(name),departments(name))")
      .eq("campaign_id", id)
      .order("sent_at", { ascending: false })
      .limit(5000);
    if (rErr) throw rErr;

    const rows = (recips ?? []).map((r) => {
      const s = r.students as unknown as {
        full_name: string; student_code: string; phone: string;
        faculties: { name: string } | null; departments: { name: string } | null;
      } | null;
      const student = {
        full_name: s?.full_name ?? "—",
        student_code: s?.student_code ?? "—",
        phone: s?.phone ?? "—",
        faculties: s?.faculties ?? null,
        departments: s?.departments ?? null,
      };
      return [
        student.full_name,
        student.student_code,
        student.phone,
        student.faculties?.name ?? "—",
        student.departments?.name ?? "—",
        STATUS_AR[r.status] ?? r.status,
        body ? renderTpl(body, student) : "—",
      ];
    });

    const buf = buildWorkbook(
      ["الاسم", "الكود", "الهاتف", "الكلية", "التخصص", "الحالة", "نص الرسالة"],
      rows,
    );
    return xlsxResponse(buf, `campaign-${id.slice(0, 8)}.xlsx`);
  } catch (e: unknown) {
    const status = (e as { status?: number })?.status ?? 500;
    return NextResponse.json({ error: e instanceof Error ? e.message : "خطأ غير متوقع." }, { status });
  }
}
