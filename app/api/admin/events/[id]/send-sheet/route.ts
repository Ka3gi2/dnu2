import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { buildWorkbook, xlsxResponse } from "@/lib/excel";
import { gatewayConfig, sendFile } from "@/lib/whatsapp";

const STAFF = ["super_admin", "president", "event_manager", "committee_head", "volunteer"];

async function loadRegistrations(eventId: string) {
  const db = createServiceClient();
  const { data: ev } = await db.from("events").select("id,title").eq("id", eventId).maybeSingle();
  if (!ev) throw Object.assign(new Error("الفعالية غير موجودة."), { status: 404 });
  const { data: regs, error } = await db
    .from("event_registrations")
    .select("status,students(full_name,student_code,phone,faculties(name),departments(name))")
    .eq("event_id", eventId)
    .order("registered_at")
    .limit(5000);
  if (error) throw error;
  return { ev, regs: regs ?? [] };
}

const STATUS_AR: Record<string, string> = {
  registered: "مسجل",
  attended: "حضر",
  cancelled: "ملغي",
  waitlist: "انتظار",
};

// POST: send the event sheet as a WhatsApp document to one number.
// Body: { to }
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession(STAFF);
    const { id } = await params;
    const { to } = await req.json();
    const target = String(to ?? "").replace(/\D/g, "");
    if (target.length < 8) return NextResponse.json({ error: "رقم الواتساب المستلم غير صحيح." }, { status: 400 });

    let cfg;
    try {
      cfg = gatewayConfig();
    } catch (e) {
      const status = (e as { status?: number })?.status ?? 500;
      return NextResponse.json({ error: e instanceof Error ? e.message : "خطأ." }, { status });
    }

    const { ev, regs } = await loadRegistrations(id);
    const rows = regs.map((r) => {
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
      ];
    });
    const buf = buildWorkbook(["الاسم", "الكود", "الهاتف", "الكلية", "التخصص", "الحالة"], rows);
    await sendFile(cfg.gateway, cfg.secret, target, `event-${id.slice(0, 8)}.xlsx`, buf);
    return NextResponse.json({ ok: true, count: rows.length });
  } catch (e: unknown) {
    const status = (e as { status?: number })?.status ?? 500;
    return NextResponse.json({ error: e instanceof Error ? e.message : "خطأ غير متوقع." }, { status });
  }
}
