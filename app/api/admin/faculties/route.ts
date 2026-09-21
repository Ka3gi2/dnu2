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

export async function GET() {
  try {
    await guard();
    const db = createServiceClient();
    const { data, error } = await db
      .from("faculties")
      .select("id,name,is_active,created_at")
      .order("name");
    if (error) throw error;
    return NextResponse.json({ faculties: data });
  } catch (e) {
    return denied(e);
  }
}

export async function POST(req: Request) {
  try {
    await guard();
    const { name } = await req.json();
    const clean = String(name ?? "").trim();
    if (!clean) return NextResponse.json({ error: "اسم الكلية مطلوب." }, { status: 400 });
    const db = createServiceClient();
    const { data, error } = await db
      .from("faculties")
      .insert({ name: clean })
      .select("id,name,is_active")
      .single();
    if (error) throw error;
    return NextResponse.json({ faculty: data });
  } catch (e) {
    return denied(e);
  }
}
