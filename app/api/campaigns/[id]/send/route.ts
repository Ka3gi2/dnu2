import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";

const COMM = ["super_admin", "president", "communication_manager", "committee_head"];

// Background jobs live in server memory (admin PC only — never Vercel).
// Close the page freely: the loop keeps running until the dev server stops.
interface Job {
  running: boolean;
  total: number;
  sent: number;
  failed: number;
  startedAt: string;
  finishedAt: string | null;
  error: string | null;
}
const jobs = new Map<string, Job>();

// Egypt mobile 01xxxxxxxxx -> 201xxxxxxxxx (E.164 without +)
function toWaNumber(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("01")) return "2" + d;
  return d;
}

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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// GET: live progress of the background send job.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession(COMM);
    const { id } = await params;
    const job = jobs.get(id);
    if (!job) return NextResponse.json({ running: false, sent: 0, failed: 0, total: 0 });
    return NextResponse.json(job);
  } catch (e: unknown) {
    const status = (e as { status?: number })?.status ?? 500;
    return NextResponse.json({ error: e instanceof Error ? e.message : "خطأ غير متوقع." }, { status });
  }
}

// POST: start background auto-send for all queued recipients. Returns immediately.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession(COMM);
    const { id } = await params;

    // Sending happens from the admin app only — web/Vercel manages, never sends.
    if ((process.env.WHATSAPP_MODE ?? "web") !== "local") {
      return NextResponse.json(
        { error: "الإرسال التلقائي من تطبيق الأدمن فقط — افتح الحملة من جهاز الأدمن." },
        { status: 403 },
      );
    }

    const existing = jobs.get(id);
    if (existing?.running) {
      return NextResponse.json({ ok: true, alreadyRunning: true, ...existing });
    }

    const db = createServiceClient();

    const gateway = (process.env.WHATSAPP_GATEWAY_URL ?? "http://localhost:3001").replace(/\/$/, "");
    const secret = process.env.WHATSAPP_GATEWAY_SECRET ?? "";

    const { data: camp, error: cErr } = await db
      .from("campaigns")
      .select("id,title,status,template_id,message_templates(body)")
      .eq("id", id)
      .single();
    if (cErr || !camp) return NextResponse.json({ error: "الحملة غير موجودة." }, { status: 404 });

    const tpl = Array.isArray(camp.message_templates) ? camp.message_templates[0] : camp.message_templates;
    const body = (tpl as { body?: string } | null)?.body ?? "";
    if (!body) return NextResponse.json({ error: "الحملة بدون قالب نصي." }, { status: 400 });

    // Gateway reachable?
    let alive = false;
    try {
      const h = await fetch(`${gateway}/status`, { signal: AbortSignal.timeout(8000) });
      alive = h.ok;
    } catch {
      alive = false;
    }
    if (!alive) {
      return NextResponse.json(
        { error: "البوابة المحلية غير شغالة. شغّل تطبيق الواتساب (EXE) على جهازك أولاً." },
        { status: 503 },
      );
    }

    const { data: recips, error: rErr } = await db
      .from("campaign_recipients")
      .select("student_id,students(id,full_name,phone,student_code,faculties(name),departments(name))")
      .eq("campaign_id", id)
      .eq("status", "queued")
      .limit(2000);
    if (rErr) throw rErr;
    if (!recips || recips.length === 0) {
      return NextResponse.json({ ok: true, sent: 0, failed: 0, note: "لا مستلمين منتظرين." });
    }

    // Pace: WHATSAPP_RATE_PER_MINUTE (default 40) — ban protection.
    const perMinute = Number(process.env.WHATSAPP_RATE_PER_MINUTE ?? 40) || 40;
    const gapMs = Math.max(1000, Math.floor(60000 / perMinute));

    const job: Job = {
      running: true,
      total: recips.length,
      sent: 0,
      failed: 0,
      startedAt: new Date().toISOString(),
      finishedAt: null,
      error: null,
    };
    jobs.set(id, job);
    await db.from("campaigns").update({ status: "sending" }).eq("id", id);

    // Fire and forget — the loop below survives page close.
    void runJob(id, job, recips, { gateway, secret, body, gapMs });

    return NextResponse.json({ ok: true, started: true, total: job.total, ratePerMinute: perMinute });
  } catch (e: unknown) {
    const status = (e as { status?: number })?.status ?? 500;
    return NextResponse.json({ error: e instanceof Error ? e.message : "خطأ غير متوقع." }, { status });
  }
}

type Recip = {
  student_id: string;
  students: unknown;
};

async function runJob(
  id: string,
  job: Job,
  recips: Recip[],
  opts: { gateway: string; secret: string; body: string; gapMs: number },
) {
  const db = createServiceClient();
  let consecutiveFails = 0;
  try {
    for (const r of recips) {
      const s = r.students as unknown as {
        full_name: string; phone: string; student_code: string;
        faculties: { name: string } | null; departments: { name: string } | null;
      } | null;
      try {
        if (!s?.phone) throw new Error("بدون رقم هاتف.");
        const text = renderTpl(opts.body, s);
        const res = await fetch(`${opts.gateway}/send`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(opts.secret ? { "x-gateway-secret": opts.secret } : {}),
          },
          body: JSON.stringify({ to: toWaNumber(s.phone), message: text }),
          signal: AbortSignal.timeout(25000),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error((d as { error?: string }).error ?? `gateway ${res.status}`);
        }
        await db
          .from("campaign_recipients")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("campaign_id", id)
          .eq("student_id", r.student_id);
        job.sent++;
        consecutiveFails = 0;
      } catch (e) {
        await db
          .from("campaign_recipients")
          .update({ status: "failed", error: e instanceof Error ? e.message : "فشل الإرسال." })
          .eq("campaign_id", id)
          .eq("student_id", r.student_id);
        job.failed++;
        consecutiveFails++;
        // Gateway died mid-run? stop instead of failing everyone.
        if (consecutiveFails >= 3) {
          job.error = "توقف الإرسال: تعذر الوصول للبوابة 3 مرات متتالية. شغّل التطبيق وكمل الباقي.";
          break;
        }
      }
      await sleep(opts.gapMs + Math.floor(Math.random() * 500));
    }
  } finally {
    job.running = false;
    job.finishedAt = new Date().toISOString();
    await db
      .from("campaigns")
      .update({ status: job.failed > 0 && job.sent === 0 ? "failed" : "done" })
      .eq("id", id);
  }
}
