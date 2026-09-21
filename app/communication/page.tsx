"use client";
import { useEffect, useState } from "react";
import { PageHeader, Empty } from "@/components/ui";

interface Campaign {
  id: string;
  title: string;
  channel: string;
  status: string;
  created_at: string;
}

const STATUS_AR: Record<string, string> = {
  draft: "مسودة",
  queued: "في الانتظار",
  sending: "جارٍ الإرسال",
  done: "اكتملت",
  failed: "فشلت",
};

export default function Communication() {
  const [templates, setTemplates] = useState<{ id: string; title: string; body: string }[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [faculties, setFaculties] = useState<{ id: string; name: string }[]>([]);
  const [title, setTitle] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [faculty, setFaculty] = useState("");
  const [tplTitle, setTplTitle] = useState("");
  const [tplBody, setTplBody] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    const [tRes, cRes] = await Promise.all([
      fetch("/api/admin/templates").then((r) => r.json()).catch(() => ({ templates: [] })),
      fetch("/api/admin/campaigns").then((r) => r.json()).catch(() => ({ campaigns: [] })),
    ]);
    setTemplates(tRes.templates ?? []);
    setCampaigns(cRes.campaigns ?? []);
  }

  useEffect(() => {
    load();
    fetch("/api/faculties")
      .then((r) => r.json())
      .then((d) => setFaculties(d.faculties ?? []))
      .catch(() => {});
  }, []);

  async function queueCampaign(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          channel: "whatsapp",
          template_id: templateId || null,
          audience_filter_json: faculty ? { faculty_id: faculty } : {},
          status: "queued",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "تعذر الحفظ.");
      window.location.href = `/communication/${data.id}`;
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "تعذر الحفظ.");
    }
  }

  async function createTemplate(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: tplTitle, body: tplBody }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "تعذر الحفظ.");
      setTplTitle("");
      setTplBody("");
      setMsg("تم حفظ القالب.");
      load();
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "تعذر الحفظ.");
    }
  }

  return (
    <div>
      <PageHeader title="مركز التواصل" sub="قوالب + حملات واتساب — الإرسال بزر wa.me المجاني لكل مستلم." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
        <div className="card reveal reveal-1">
          <h3>حملة جديدة</h3>
          <form onSubmit={queueCampaign} style={{ marginTop: 12 }}>
            <label className="label">
              عنوان الحملة
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </label>
            <label className="label">
              القالب
              <select className="select" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                <option value="">بدون قالب</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </label>
            <label className="label">
              الجمهور: فلترة بالكلية
              <select className="select" value={faculty} onChange={(e) => setFaculty(e.target.value)}>
                <option value="">كل الكليات</option>
                {faculties.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </label>
            <button className="btn btn-gold">إنشاء وفتح المستلمين</button>
          </form>
        </div>
        <div className="card reveal reveal-2">
          <h3>قالب جديد</h3>
          <form onSubmit={createTemplate} style={{ marginTop: 12 }}>
            <label className="label">
              اسم القالب
              <input className="input" value={tplTitle} onChange={(e) => setTplTitle(e.target.value)} required
                placeholder="مثال: تذكير بفعالية" />
            </label>
            <label className="label">
              النص (يدعم المتغيرات)
              <textarea className="input" rows={4} value={tplBody} onChange={(e) => setTplBody(e.target.value)}
                required placeholder={"مثال: أهلاً {{name}}، بانتظارك غداً في {{faculty}}"} />
            </label>
            <div className="meta" style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 10 }}>
              {"{{name}}"} الاسم · {"{{code}}"} الكود · {"{{faculty}}"} الكلية · {"{{department}}"} القسم
            </div>
            <button className="btn btn-navy">حفظ القالب</button>
          </form>
        </div>
      </div>
      {msg && <div className="alert">{msg}</div>}

      <h2 className="section-title">الحملات</h2>
      {campaigns.length === 0 ? (
        <Empty text="لا حملات بعد — أنشئ أول حملة من الأعلى." />
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {campaigns.map((c) => (
            <a key={c.id} href={`/communication/${c.id}`} className="row-card">
              <div style={{ flex: 1 }}>
                <strong>{c.title}</strong>
                <div className="meta">واتساب · {new Date(c.created_at).toLocaleString("ar")}</div>
              </div>
              <span className={`pill ${c.status === "done" ? "pill-green" : c.status === "queued" ? "pill-gold" : ""}`}>
                {STATUS_AR[c.status] ?? c.status}
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
