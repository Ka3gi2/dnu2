import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";

const COMM = ["super_admin", "president", "communication_manager", "committee_head"];

function denied(e: unknown) {
  const status = (e as { status?: number })?.status ?? 500;
  const error = e instanceof Error ? e.message : "خطأ غير متوقع.";
  return NextResponse.json({ error }, { status });
}

export async function POST(req: Request) {
  try {
    await requireSession(COMM);
    const body = await req.json();
    const { title, channel, template_id, audience_filter_json, status } = body;
    if (!title || !String(title).trim()) {
      return NextResponse.json({ error: "عنوان الحملة مطلوب." }, { status: 400 });
    }
    const db = createServiceClient();
    const { data, error } = await db
      .from("campaigns")
      .insert({
        title: String(title).trim(),
        channel: channel ?? "whatsapp",
        template_id: template_id || null,
        audience_filter_json: audience_filter_json ?? {},
        status: status ?? "draft",
      })
      .select("id")
      .single();
    if (error) throw error;
    return NextResponse.json({ id: data.id });
  } catch (e) {
    return denied(e);
  }
}
