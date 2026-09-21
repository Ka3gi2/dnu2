import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";

export async function GET() {
  try {
    await requireSession(["super_admin", "president", "event_manager", "committee_head", "volunteer"]);
    const db = createServiceClient();
    const { data, error } = await db
      .from("events")
      .select("id,title,status,starts_at")
      .order("starts_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return NextResponse.json({ events: data });
  } catch (e: unknown) {
    const status = (e as { status?: number })?.status ?? 500;
    return NextResponse.json({ error: e instanceof Error ? e.message : "خطأ غير متوقع." }, { status });
  }
}
