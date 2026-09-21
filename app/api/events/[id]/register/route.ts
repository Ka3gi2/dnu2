import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";

// Student registers self in a published event.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id: event_id } = await params;
    const db = createServiceClient();

    const { data: u } = await db
      .from("users")
      .select("student_id")
      .eq("id", session.uid)
      .single();
    if (!u?.student_id) {
      return NextResponse.json({ error: "هذا الحساب غير مرتبط بملف طالب." }, { status: 403 });
    }

    const { data: ev } = await db
      .from("events")
      .select("id,status,capacity")
      .eq("id", event_id)
      .single();
    if (!ev || ev.status !== "published") {
      return NextResponse.json({ error: "الفعالية غير متاحة للتسجيل." }, { status: 400 });
    }

    const { data: existing } = await db
      .from("event_registrations")
      .select("id,status")
      .eq("event_id", event_id)
      .eq("student_id", u.student_id)
      .maybeSingle();
    if (existing) {
      if (existing.status !== "cancelled") {
        return NextResponse.json({ ok: true, status: existing.status });
      }
      const { error } = await db
        .from("event_registrations")
        .update({ status: "registered", registered_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (error) throw error;
      return NextResponse.json({ ok: true, status: "registered" });
    }

    const { error } = await db.from("event_registrations").insert({
      event_id,
      student_id: u.student_id,
      status: "registered",
    });
    if (error) throw error;
    return NextResponse.json({ ok: true, status: "registered" });
  } catch (e: unknown) {
    const status = (e as { status?: number })?.status ?? 500;
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "خطأ غير متوقع." },
      { status }
    );
  }
}
