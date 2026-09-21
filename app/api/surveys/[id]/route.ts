import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { readSession } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await readSession();
    if (!session) return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
    const { id } = await params;
    const db = createServiceClient();

    const { data: survey } = await db
      .from("surveys")
      .select("id,title,description,status,event_id")
      .eq("id", id)
      .single();
    if (!survey) return NextResponse.json({ error: " الاستبيان غير موجود." }, { status: 404 });

    const { data: questions } = await db
      .from("survey_questions")
      .select("id,question,question_type,options,is_required,sort_order")
      .eq("survey_id", id)
      .order("sort_order");

    const svc = createServiceClient();
    const { data: user } = await svc.from("users").select("student_id").eq("id", session.uid).single();

    let myAnswers: Record<string, string> = {};
    if (user?.student_id) {
      const { data: responses } = await db
        .from("survey_responses")
        .select("question_id,answer")
        .eq("survey_id", id)
        .eq("student_id", user.student_id);
      if (responses) {
        responses.forEach((r: { question_id: string; answer: string }) => {
          myAnswers[r.question_id] = r.answer;
        });
      }
    }

    return NextResponse.json({ survey, questions: questions ?? [], myAnswers });
  } catch (e: unknown) {
    const status = (e as { status?: number })?.status ?? 500;
    return NextResponse.json({ error: e instanceof Error ? e.message : "خطأ." }, { status });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await readSession();
    if (!session) return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
    const { id } = await params;
    const body = await req.json();
    const answers: { question_id: string; answer: string }[] = body.answers ?? [];
    if (!answers.length) return NextResponse.json({ error: "لا توجد إجابات." }, { status: 400 });

    const db = createServiceClient();
    const svc = createServiceClient();
    const { data: user } = await svc.from("users").select("student_id").eq("id", session.uid).single();
    if (!user?.student_id) return NextResponse.json({ error: "لم يتم العثور على ملف الطالب." }, { status: 404 });

    const rows = answers.map((a) => ({
      survey_id: id,
      question_id: a.question_id,
      student_id: user.student_id,
      answer: a.answer,
    }));

    const { error } = await db.from("survey_responses").upsert(rows, {
      onConflict: "survey_id,question_id,student_id",
    });
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const status = (e as { status?: number })?.status ?? 500;
    return NextResponse.json({ error: e instanceof Error ? e.message : "خطأ." }, { status });
  }
}
