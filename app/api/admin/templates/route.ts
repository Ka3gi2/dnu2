import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";

export async function GET() {
  try {
    await requireSession(["super_admin", "president", "communication_manager", "committee_head"]);
    const db = createServiceClient();
    const { data, error } = await db
      .from("message_templates")
      .select("id,title,body")
      .limit(50);
    if (error) throw error;
    return NextResponse.json({ templates: data });
  } catch (e: unknown) {
    const status = (e as { status?: number })?.status ?? 500;
    return NextResponse.json({ error: e instanceof Error ? e.message : "خطأ غير متوقع." }, { status });
  }
}
