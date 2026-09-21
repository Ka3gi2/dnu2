"use client";
import { useEffect, useState } from "react";
import { PageHeader, Empty } from "@/components/ui";

interface Survey { id: string; title: string; description: string | null; status: string; created_at: string; events: { title: string } | null; }
interface Question { id: string; question: string; question_type: string; options: string[] | null; is_required: boolean; sort_order: number; }

export default function SurveysPage() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [myAnswers, setMyAnswers] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/surveys").then(r => r.json()).then(d => setSurveys(d.surveys ?? [])).catch(() => {});
  }, []);

  async function openSurvey(id: string) {
    setSelected(id);
    setMsg("");
    try {
      const r = await fetch(`/api/surveys/${id}`);
      const d = await r.json();
      setQuestions(d.questions ?? []);
      setMyAnswers(d.myAnswers ?? {});
    } catch {}
  }

  async function submit() {
    if (!selected) return;
    setLoading(true);
    setMsg("");
    try {
      const answers = questions
        .filter(q => myAnswers[q.id])
        .map(q => ({ question_id: q.id, answer: myAnswers[q.id] }));
      const r = await fetch(`/api/surveys/${selected}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setMsg("تم حفظ إجاباتك بنجاح.");
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "خطأ.");
    } finally {
      setLoading(false);
    }
  }

  function setAnswer(qId: string, val: string) {
    setMyAnswers(prev => ({ ...prev, [qId]: val }));
  }

  if (selected) {
    const survey = surveys.find(s => s.id === selected);
    return (
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <button className="btn btn-outline" style={{ marginBottom: 14 }} onClick={() => setSelected(null)}>← رجوع</button>
        <div className="card reveal">
          <h2 style={{ margin: "0 0 4px", fontSize: 20 }}>{survey?.title}</h2>
          <p className="section-sub" style={{ margin: "0 0 20px" }}>مرتبطة بـ: {survey?.events?.title}</p>

          {questions.map((q, i) => (
            <div key={q.id} style={{ marginBottom: 20, padding: "14px 0", borderBottom: "1px solid var(--line)" }}>
              <p style={{ fontWeight: 800, margin: "0 0 10px", fontSize: 15 }}>
                {i + 1}. {q.question}
                {q.is_required && <span style={{ color: "var(--gold-500)", marginRight: 4 }}>*</span>}
              </p>

              {q.question_type === "choice" && q.options && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {(q.options as string[]).map((opt, j) => (
                    <label key={j} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, border: "1.5px solid var(--line)", cursor: "pointer", background: myAnswers[q.id] === opt ? "var(--navy-100)" : "var(--bg)", transition: "all 0.15s" }}>
                      <input type="radio" name={q.id} checked={myAnswers[q.id] === opt} onChange={() => setAnswer(q.id, opt)} style={{ accentColor: "var(--navy-700)" }} />
                      <span style={{ fontSize: 14 }}>{opt}</span>
                    </label>
                  ))}
                </div>
              )}

              {q.question_type === "rating" && (
                <div style={{ display: "flex", gap: 8 }}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} type="button" onClick={() => setAnswer(q.id, String(n))}
                      style={{
                        width: 44, height: 44, borderRadius: 10, border: "2px solid var(--line)",
                        background: myAnswers[q.id] === String(n) ? "var(--gold-500)" : "var(--bg)",
                        color: myAnswers[q.id] === String(n) ? "var(--navy-950)" : "var(--ink)",
                        fontWeight: 800, fontSize: 16, cursor: "pointer", fontFamily: "inherit",
                      }}>
                      {n}
                    </button>
                  ))}
                </div>
              )}

              {q.question_type === "text" && (
                <textarea className="input" style={{ minHeight: 80, resize: "vertical" }}
                  value={myAnswers[q.id] ?? ""} onChange={e => setAnswer(q.id, e.target.value)}
                  placeholder="اكتب إجابتك هنا..." />
              )}
            </div>
          ))}

          {msg && <div className="alert" style={{ marginBottom: 12 }}>{msg}</div>}
          <button className="btn btn-navy" style={{ width: "100%" }} disabled={loading} onClick={submit}>
            {loading ? "جارٍ الحفظ..." : "إرسال الإجابات"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="الاستبيانات" sub="شارك في الاستبيانات المتاحة و ساهم في تحسين الفعاليات." />
      {surveys.length === 0 ? (
        <Empty text="لا استبيانات متاحة حالياً." />
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {surveys.map(s => (
            <div key={s.id} className="card reveal" style={{ display: "flex", gap: 14, alignItems: "center", cursor: "pointer" }}
              onClick={() => openSurvey(s.id)}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--navy-100)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>📋</div>
              <div style={{ flex: 1 }}>
                <strong style={{ fontSize: 16 }}>{s.title}</strong>
                <div className="meta" style={{ fontSize: 13 }}>مرتبطة بـ: {s.events?.title ?? "—"}</div>
                {s.description && <div className="meta" style={{ fontSize: 12, marginTop: 2 }}>{s.description}</div>}
              </div>
              <button className="btn btn-navy btn-sm">شارك الآن</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
