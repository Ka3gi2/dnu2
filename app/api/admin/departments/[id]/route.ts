import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";

async function guard() {
  await requireSession(["super_admin", "president"]);
}

function denied(e: unknown) {
  const status = (e as { status?: number })?.status ?? 500;
  const error = e instanceof Error ? e.message : "خطأ غير متوقع.";
  return NextResponse.json({ error }, { status });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await guard();
    const { id } = await params;
    const body = await req.json();
    const patch: { name?: string; is_active?: boolean } = {};
    if (body.name !== undefined) {
      const clean = String(body.name).trim();
      if (!clean) return NextResponse.json({ error: "الاسم لا يكون فارغاً." }, { status: 400 });
      patch.name = clean;
    }
    if (body.is_active !== undefined) patch.is_active = Boolean(body.is_active);
    const db = createServiceClient();
    const { data, error } = await db
      .from("departments")
      .update(patch)
      .eq("id", id)
      .select("id,faculty_id,name,is_active")
      .single();
    if (error) throw error;
    return NextResponse.json({ department: data });
  } catch (e) {
    return denied(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await guard();
    const { id } = await params;
    const db = createServiceClient();
    const { count } = await db
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("department_id", id);
    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { error: "لا يمكن الحذف — يوجد طلبة مرتبطين. عطّله بدلاً من الحذف." },
        { status: 409 }
      );
    }
    const { error } = await db.from("departments").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return denied(e);
  }
}
