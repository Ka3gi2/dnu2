import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = createServiceClient();
    const { data, error } = await db
      .from("survey_questions")
      .select("*")
      .eq("survey_id", id)
      .order("sort_order");
    if (error) throw error;
    return NextResponse.json({ questions: data });
  } catch (e: unknown) {
    const status = (e as { status?: number })?.status ?? 500;
    return NextResponse.json({ error: e instanceof Error ? e.message : "خطأ." }, { status });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession(["super_admin", "president", "event_manager", "committee_head"]);
    const { id } = await params;
    const body = await req.json();
    const question = String(body.question ?? "").trim();
    if (!question) return NextResponse.json({ error: "السؤال مطلوب." }, { status: 400 });

    const db = createServiceClient();

    const { count } = await db
      .from("survey_questions")
      .select("id", { count: "exact", head: true })
      .eq("survey_id", id);

    const { data, error } = await db
      .from("survey_questions")
      .insert({
        survey_id: id,
        question,
        question_type: body.question_type || "choice",
        options: body.options || [],
        is_required: body.is_required !== false,
        sort_order: (count ?? 0) + 1,
      })
      .select("id")
      .single();
    if (error) throw error;
    return NextResponse.json({ question: data });
  } catch (e: unknown) {
    const status = (e as { status?: number })?.status ?? 500;
    return NextResponse.json({ error: e instanceof Error ? e.message : "خطأ." }, { status });
  }
}
