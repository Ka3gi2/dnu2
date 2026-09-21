"use client";
import { useEffect, useState } from "react";
import { PageHeader, Empty } from "@/components/ui";

interface Survey {
  id: string;
  title: string;
  description: string | null;
  status: string;
  event_id: string;
  created_at: string;
  events: { title: string } | null;
}
interface Event { id: string; title: string; }

export default function SurveysAdmin() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [eventId, setEventId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<{ question: string; question_type: string; options: string[] }[]>([]);
  const [qText, setQText] = useState("");
  const [qType, setQType] = useState("choice");
  const [qOptions, setQOptions] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    try {
      const r = await fetch("/api/admin/surveys");
      const d = await r.json();
      setSurveys(d.surveys ?? []);
    } catch {}
    try {
      const r = await fetch("/api/admin/events");
      const d = await r.json();
      setEvents(d.events ?? []);
    } catch {}
  }

  useEffect(() => { load(); }, []);

  async function createSurvey(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    try {
      const r = await fetch("/api/admin/surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description: desc || null, event_id: eventId }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setTitle(""); setDesc(""); setEventId("");
      setMsg("تم إنشاء الاستبيان.");
      load();
    } catch (err: unknown) { setMsg(err instanceof Error ? err.message : "خطأ."); }
  }

  async function toggleStatus(s: Survey, newStatus: string) {
    try {
      await fetch(`/api/admin/surveys/${s.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      load();
    } catch {}
  }

  async function deleteSurvey(s: Survey) {
    if (!confirm(`حذف استبيان "${s.title}"؟`)) return;
    try {
      await fetch(`/api/admin/surveys/${s.id}`, { method: "DELETE" });
      load();
    } catch {}
  }

  async function addQuestion() {
    if (!editingId || !qText.trim()) return;
    setMsg("");
    try {
      const opts = qType === "choice" ? qOptions.split(",").map(o => o.trim()).filter(Boolean) : [];
      const r = await fetch(`/api/admin/surveys/${editingId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: qText, question_type: qType, options: opts }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setQText(""); setQOptions("");
      loadQuestions(editingId);
      setMsg("تمت إضافة السؤال.");
    } catch (err: unknown) { setMsg(err instanceof Error ? err.message : "خطأ."); }
  }

  async function loadQuestions(surveyId: string) {
    const r = await fetch(`/api/admin/surveys/${surveyId}/questions`);
    const d = await r.json();
    setQuestions(d.questions ?? []);
  }

  function openEditor(s: Survey) {
    setEditingId(s.id);
    setQuestions([]);
    loadQuestions(s.id);
  }

  const statusLabels: Record<string, string> = { draft: "مسودة", open: "مفعّل", closed: "مغلق" };
  const statusColors: Record<string, string> = { draft: "", open: "pill-green", closed: "" };

  return (
    <div>
      <PageHeader title="الاستبيانات" sub="إنشاء استبيانات مرتبطه بفعالية معينة و активارها للطلبة." />

      <div className="card reveal" style={{ marginBottom: 14 }}>
        <h3 style={{ margin: "0 0 10px" }}>استبيان جديد</h3>
        <form onSubmit={createSurvey} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="grid-2">
            <label className="label">
              اسم الاستبيان
              <input className="input" value={title} onChange={e => setTitle(e.target.value)} required placeholder="مثال: استبيان ما بعد الفعالية" />
            </label>
            <label className="label">
              الفعالية
              <select className="select" value={eventId} onChange={e => setEventId(e.target.value)} required>
                <option value="">— اختر فعالية —</option>
                {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
              </select>
            </label>
          </div>
          <label className="label">
            وصف (اختياري)
            <input className="input" value={desc} onChange={e => setDesc(e.target.value)} placeholder="اختياري" />
          </label>
          <button className="btn btn-navy" style={{ alignSelf: "flex-start" }}>إنشاء الاستبيان</button>
        </form>
      </div>

      {msg && <div className="alert" style={{ marginBottom: 14 }}>{msg}</div>}

      {surveys.length === 0 ? (
        <Empty text="لا استبيانات بعد." />
      ) : (
        surveys.map(s => (
          <div key={s.id} className="card reveal" style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <strong style={{ fontSize: 16 }}>{s.title}</strong>
              <span className={`pill ${statusColors[s.status]}`}>{statusLabels[s.status] ?? s.status}</span>
              <span className="meta">مرتبطة بـ: {s.events?.title ?? "—"}</span>
              <span style={{ flex: 1 }} />
              {s.status === "draft" && (
                <button className="btn btn-gold btn-sm" onClick={() => toggleStatus(s, "open")}>تفعيل</button>
              )}
              {s.status === "open" && (
                <button className="btn btn-outline btn-sm" onClick={() => toggleStatus(s, "closed")}>إغلاق</button>
              )}
              {s.status === "closed" && (
                <button className="btn btn-outline btn-sm" onClick={() => toggleStatus(s, "open")}>إعادة فتح</button>
              )}
              <button className="btn btn-outline btn-sm" onClick={() => openEditor(s)}>
                {editingId === s.id ? "إخفاء" : "الأسئلة"}
              </button>
              <button className="btn btn-danger btn-sm" onClick={() => deleteSurvey(s)}>حذف</button>
            </div>

            {editingId === s.id && (
              <div style={{ marginTop: 14, borderTop: "1px solid var(--line)", paddingTop: 14 }}>
                <h4 style={{ margin: "0 0 10px" }}>الأسئلة ({questions.length})</h4>
                {questions.map((q, i) => (
                  <div key={i} style={{ padding: "8px 12px", background: "var(--bg)", borderRadius: 8, marginBottom: 6, fontSize: 13 }}>
                    <strong>{i + 1}. {q.question}</strong>
                    <span className="pill" style={{ marginRight: 8 }}>{q.question_type === "choice" ? "اختيارات" : q.question_type === "rating" ? "تقييم" : "نص حر"}</span>
                    {q.question_type === "choice" && q.options && (
                      <span className="meta" style={{ marginRight: 8 }}>
                        {(q.options as string[]).join(" | ")}
                      </span>
                    )}
                  </div>
                ))}
                <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  <input className="input" style={{ marginTop: 0, flex: 1, minWidth: 200 }} value={qText}
                    onChange={e => setQText(e.target.value)} placeholder="السؤال" />
                  <select className="select" style={{ marginTop: 0, width: 120 }} value={qType} onChange={e => setQType(e.target.value)}>
                    <option value="choice">اختيارات</option>
                    <option value="text">نص حر</option>
                    <option value="rating">تقييم 1-5</option>
                  </select>
                  {qType === "choice" && (
                    <input className="input" style={{ marginTop: 0, flex: 1, minWidth: 200 }} value={qOptions}
                      onChange={e => setQOptions(e.target.value)} placeholder="الخيارات (مفصولة بفاصلة)" />
                  )}
                  <button className="btn btn-navy btn-sm" onClick={addQuestion}>إضافة سؤال</button>
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
