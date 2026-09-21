import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession(["super_admin", "president", "event_manager", "committee_head"]);
    const { id } = await params;
    const body = await req.json();
    const db = createServiceClient();

    if (body.status) {
      const { error } = await db.from("surveys").update({ status: body.status }).eq("id", id);
      if (error) throw error;
    }
    if (body.title) {
      const { error } = await db.from("surveys").update({ title: body.title }).eq("id", id);
      if (error) throw error;
    }
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const status = (e as { status?: number })?.status ?? 500;
    return NextResponse.json({ error: e instanceof Error ? e.message : "خطأ." }, { status });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession(["super_admin", "president"]);
    const { id } = await params;
    const db = createServiceClient();
    const { error } = await db.from("surveys").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const status = (e as { status?: number })?.status ?? 500;
    return NextResponse.json({ error: e instanceof Error ? e.message : "خطأ." }, { status });
  }
}
