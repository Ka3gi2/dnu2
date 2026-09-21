import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";

// POST: check-in a student by QR token for an event
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(["super_admin", "president", "event_manager", "committee_head", "volunteer"]);
    const { id: event_id } = await params;
    const { qr_token } = await req.json();
    if (!qr_token) return NextResponse.json({ error: "QR token مطلوب." }, { status: 400 });

    const db = createServiceClient();

    // Find student by QR token
    const { data: student } = await db
      .from("students")
      .select("id,full_name,student_code,phone")
      .eq("qr_token", qr_token)
      .maybeSingle();
    if (!student) return NextResponse.json({ error: "طالب غير موجود بهذا الكود." }, { status: 404 });

    // Check event exists and is published
    const { data: ev } = await db
      .from("events")
      .select("id,title,status,starts_at")
      .eq("id", event_id)
      .single();
    if (!ev || ev.status !== "published") {
      return NextResponse.json({ error: "الفعالية غير متاحة." }, { status: 400 });
    }

    // Check if already checked in today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data: existing } = await db
      .from("attendance_logs")
      .select("id")
      .eq("event_id", event_id)
      .eq("student_id", student.id)
      .gte("scanned_at", today.toISOString())
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ ok: true, student, status: "already_checked_in", message: "تم تسجيل حضوره بالفعل اليوم." });
    }

    // Check registration
    const { data: reg } = await db
      .from("event_registrations")
      .select("id,status")
      .eq("event_id", event_id)
      .eq("student_id", student.id)
      .maybeSingle();

    // Auto-register if not registered
    if (!reg) {
      await db.from("event_registrations").insert({
        event_id,
        student_id: student.id,
        status: "attended",
        check_in_method: "qr",
        attended_at: new Date().toISOString(),
      });
    } else if (reg.status !== "attended") {
      await db
        .from("event_registrations")
        .update({ status: "attended", check_in_method: "qr", attended_at: new Date().toISOString() })
        .eq("id", reg.id);
    }

    // Log attendance
    await db.from("attendance_logs").insert({
      event_id,
      student_id: student.id,
      scanned_by_user_id: session.uid,
    });

    // Update student stats
    const { data: stats } = await db
      .from("student_stats")
      .select("events_attended")
      .eq("student_id", student.id)
      .maybeSingle();
    const newCount = (stats?.events_attended ?? 0) + 1;
    if (stats) {
      await db
        .from("student_stats")
        .update({ events_attended: newCount, last_updated: new Date().toISOString() })
        .eq("student_id", student.id);
    } else {
      await db.from("student_stats").insert({ student_id: student.id, events_attended: newCount });
    }

    // Award badges based on events attended
    const badgeThresholds = [
      { count: 1, code: "first_event", name: "الخطوة الأولى" },
      { count: 3, code: "regular", name: "عضو نشط" },
      { count: 5, code: "star", name: "نجم الاتحاد" },
      { count: 10, code: "legend", name: "أسطورة الاتحاد" },
    ];
    for (const t of badgeThresholds) {
      if (newCount >= t.count) {
        const { data: existingBadge } = await db
          .from("badges")
          .select("id")
          .eq("code", t.code)
          .maybeSingle();
        if (existingBadge) {
          const { data: alreadyHas } = await db
            .from("student_badges")
            .select("id")
            .eq("student_id", student.id)
            .eq("badge_id", existingBadge.id)
            .maybeSingle();
          if (!alreadyHas) {
            await db.from("student_badges").insert({
              student_id: student.id,
              badge_id: existingBadge.id,
              awarded_reason: `${t.name} — حضور ${newCount} فعاليات`,
            });
          }
        }
      }
    }

    // Add activity
    await db.from("activities").insert({
      student_id: student.id,
      type: "event",
      title: ev.title,
      event_id: ev.id,
      verified_by: session.uid,
      verified_at: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, student, status: "checked_in", message: `تم تسجيل حضور ${student.full_name}.` });
  } catch (e: unknown) {
    const status = (e as { status?: number })?.status ?? 500;
    return NextResponse.json({ error: e instanceof Error ? e.message : "خطأ غير متوقع." }, { status });
  }
}
