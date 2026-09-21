import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";

function denied(e: unknown) {
  const status = (e as { status?: number })?.status ?? 500;
  const error = e instanceof Error ? e.message : "خطأ غير متوقع.";
  return NextResponse.json({ error }, { status });
}

// Create a message template (variables: {{name}} {{code}} {{faculty}} {{department}}).
export async function POST(req: Request) {
  try {
    await requireSession(["super_admin", "president", "communication_manager", "committee_head"]);
    const { title, body } = await req.json();
    const t = String(title ?? "").trim();
    const b = String(body ?? "").trim();
    if (!t || !b) return NextResponse.json({ error: "العنوان والنص مطلوبان." }, { status: 400 });
    const db = createServiceClient();
    const { data, error } = await db
      .from("message_templates")
      .insert({ title: t, body: b })
      .select("id,title,body")
      .single();
    if (error) throw error;
    return NextResponse.json({ template: data });
  } catch (e) {
    return denied(e);
  }
}
