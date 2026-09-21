import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";

export async function GET() {
  try {
    await requireSession(["super_admin", "president", "event_manager", "committee_head"]);
    const db = createServiceClient();
    const { data, error } = await db
      .from("surveys")
      .select("id,title,description,status,event_id,created_at,events(title)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ surveys: data });
  } catch (e: unknown) {
    const status = (e as { status?: number })?.status ?? 500;
    return NextResponse.json({ error: e instanceof Error ? e.message : "خطأ." }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession(["super_admin", "president", "event_manager", "committee_head"]);
    const body = await req.json();
    const title = String(body.title ?? "").trim();
    const event_id = String(body.event_id ?? "");
    if (!title) return NextResponse.json({ error: "اسم الاستبيان مطلوب." }, { status: 400 });
    if (!event_id) return NextResponse.json({ error: "اختر الفعالية." }, { status: 400 });

    const db = createServiceClient();
    const { data, error } = await db
      .from("surveys")
      .insert({ title, description: body.description || null, event_id, created_by: session.uid })
      .select("id")
      .single();
    if (error) throw error;
    return NextResponse.json({ survey: data });
  } catch (e: unknown) {
    const status = (e as { status?: number })?.status ?? 500;
    return NextResponse.json({ error: e instanceof Error ? e.message : "خطأ." }, { status });
  }
}
