import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { checkGateway, gatewayConfig, sendOne, sleep } from "@/lib/whatsapp";

const STAFF = ["super_admin", "president", "committee_head"];

interface CredJob {
  running: boolean;
  total: number;
  sent: number;
  failed: number;
  startedAt: string;
  finishedAt: string | null;
  error: string | null;
}

let job: CredJob | null = null;

function denied(e: unknown) {
  const status = (e as { status?: number })?.status ?? 500;
  return NextResponse.json({ error: e instanceof Error ? e.message : "خطأ غير متوقع." }, { status });
}

// GET: pending + recent credential messages (one place for later sending).
export async function GET() {
  try {
    await requireSession(STAFF);
    const db = createServiceClient();
    const { data, error } = await db
      .from("credential_outbox")
      .select("id,phone,message,status,error,created_at,sent_at,students(full_name,student_code)")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    const items = data ?? [];
    return NextResponse.json({
      items,
      queued: items.filter((i) => i.status === "queued").length,
      job,
    });
  } catch (e) {
    return denied(e);
  }
}

// POST: background-send all queued credential messages via the gateway.
export async function POST() {
  try {
    await requireSession(STAFF);
    if (job?.running) return NextResponse.json({ ok: true, alreadyRunning: true, job });

    let cfg;
    try {
      cfg = gatewayConfig();
    } catch (e) {
      return denied(e);
    }
    if (!(await checkGateway(cfg.gateway))) {
      return NextResponse.json(
        { error: "البوابة المحلية غير شغالة. شغّل تطبيق الواتساب (EXE) على جهازك أولاً." },
        { status: 503 },
      );
    }

    const db = createServiceClient();
    const { data: rows, error } = await db
      .from("credential_outbox")
      .select("id,phone,message")
      .eq("status", "queued")
      .order("created_at")
      .limit(2000);
    if (error) throw error;
    if (!rows || rows.length === 0) {
      return NextResponse.json({ ok: true, sent: 0, failed: 0, note: "لا رسائل منتظرة." });
    }

    job = {
      running: true,
      total: rows.length,
      sent: 0,
      failed: 0,
      startedAt: new Date().toISOString(),
      finishedAt: null,
      error: null,
    };
    void runJob(rows, cfg);
    return NextResponse.json({ ok: true, started: true, total: job.total, ratePerMinute: cfg.perMinute });
  } catch (e) {
    return denied(e);
  }
}

async function runJob(
  rows: { id: string; phone: string; message: string }[],
  cfg: { gateway: string; secret: string; gapMs: number },
) {
  const db = createServiceClient();
  let consecutiveFails = 0;
  try {
    for (const r of rows) {
      try {
        await sendOne(cfg.gateway, cfg.secret, r.phone, r.message);
        await db
          .from("credential_outbox")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", r.id);
        if (job) job.sent++;
        consecutiveFails = 0;
      } catch (e) {
        await db
          .from("credential_outbox")
          .update({ status: "failed", error: e instanceof Error ? e.message : "فشل الإرسال." })
          .eq("id", r.id);
        if (job) job.failed++;
        consecutiveFails++;
        if (consecutiveFails >= 3) {
          if (job) job.error = "توقف الإرسال: تعذر الوصول للبوابة 3 مرات متتالية.";
          break;
        }
      }
      await sleep(cfg.gapMs + Math.floor(Math.random() * 500));
    }
  } finally {
    if (job) {
      job.running = false;
      job.finishedAt = new Date().toISOString();
    }
  }
}
