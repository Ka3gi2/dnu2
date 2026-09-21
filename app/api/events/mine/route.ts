import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";

// Events the logged-in student is registered in.
export async function GET() {
  try {
    const session = await requireSession();
    const db = createServiceClient();
    const { data: u } = await db
      .from("users")
      .select("student_id")
      .eq("id", session.uid)
      .single();
    if (!u?.student_id) return NextResponse.json({ event_ids: [] });
    const { data, error } = await db
      .from("event_registrations")
      .select("event_id")
      .eq("student_id", u.student_id)
      .neq("status", "cancelled");
    if (error) throw error;
    return NextResponse.json({ event_ids: (data ?? []).map((r) => r.event_id) });
  } catch (e: unknown) {
    const status = (e as { status?: number })?.status ?? 500;
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "خطأ غير متوقع." },
      { status }
    );
  }
}
