import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";

const COMM = ["super_admin", "president", "communication_manager", "committee_head"];

function denied(e: unknown) {
  const status = (e as { status?: number })?.status ?? 500;
  const error = e instanceof Error ? e.message : "خطأ غير متوقع.";
  return NextResponse.json({ error }, { status });
}

// GET: resolve campaign audience -> upsert recipients -> return with student data.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession(COMM);
    const { id } = await params;
    const db = createServiceClient();

    const { data: camp, error: cErr } = await db
      .from("campaigns")
      .select("id,title,channel,status,audience_filter_json,template_id,message_templates(body)")
      .eq("id", id)
      .single();
    if (cErr || !camp) throw new Error("الحملة غير موجودة.");

    const faculty_id = (camp.audience_filter_json as { faculty_id?: string } | null)?.faculty_id;
    let q = db.from("students").select("id,full_name,phone,student_code,faculty_id,department_id").eq("status", "active");
    if (faculty_id) q = q.eq("faculty_id", faculty_id);
    const { data: students, error: sErr } = await q.limit(2000);
    if (sErr) throw sErr;

    const rows = (students ?? []).map((s) => ({ campaign_id: id, student_id: s.id, status: "queued" as const }));
    if (rows.length > 0) {
      const { error: uErr } = await db
        .from("campaign_recipients")
        .upsert(rows, { onConflict: "campaign_id,student_id", ignoreDuplicates: true });
      if (uErr) throw uErr;
    }

    const { data: recips, error: rErr } = await db
      .from("campaign_recipients")
      .select("status,sent_at,student_id,students(id,full_name,phone,student_code,faculties(name),departments(name))")
      .eq("campaign_id", id)
      .limit(2000);
    if (rErr) throw rErr;

    const tpl = Array.isArray(camp.message_templates) ? camp.message_templates[0] : camp.message_templates;
    return NextResponse.json({
      campaign: { id: camp.id, title: camp.title, status: camp.status },
      template_body: (tpl as { body?: string } | null)?.body ?? "",
      recipients: recips ?? [],
      total: (recips ?? []).length,
    });
  } catch (e) {
    return denied(e);
  }
}

// POST: mark a recipient sent/delivered/failed.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession(COMM);
    const { id } = await params;
    const { student_id, status } = await req.json();
    if (!["sent", "delivered", "failed"].includes(String(status))) {
      return NextResponse.json({ error: "حالة غير صحيحة." }, { status: 400 });
    }
    const db = createServiceClient();
    const patch: Record<string, string> = { status: String(status) };
    if (status !== "failed") patch.sent_at = new Date().toISOString();
    const { error } = await db
      .from("campaign_recipients")
      .update(patch)
      .eq("campaign_id", id)
      .eq("student_id", String(student_id));
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return denied(e);
  }
}
