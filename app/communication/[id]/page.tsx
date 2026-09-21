"use client";
import { useEffect, useState } from "react";
import { PageHeader, Empty } from "@/components/ui";

interface Recipient {
  status: string;
  sent_at: string | null;
  student_id: string;
  students: {
    id: string;
    full_name: string;
    phone: string;
    student_code: string;
    faculties: { name: string } | null;
    departments: { name: string } | null;
  } | null;
}

function toWaNumber(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("01")) return "2" + d; // Egypt 01x -> 201x
  return d;
}

function renderTpl(body: string, r: Recipient): string {
  const s = r.students;
  return body
    .replaceAll("{{name}}", s?.full_name ?? "")
    .replaceAll("{{code}}", s?.student_code ?? "")
    .replaceAll("{{phone}}", s?.phone ?? "")
    .replaceAll("{{faculty}}", s?.faculties?.name ?? "")
    .replaceAll("{{department}}", s?.departments?.name ?? "");
}

export default function CampaignDetail({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState("");
  const [title, setTitle] = useState("");
  const [tpl, setTpl] = useState("");
  const [rows, setRows] = useState<Recipient[]>([]);
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState<{ running: boolean; sent: number; failed: number; total: number; error?: string | null } | null>(null);

  async function load(cid: string) {
    setMsg("");
    try {
      const res = await fetch(`/api/campaigns/${cid}/recipients`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "تعذر التحميل.");
      setTitle(data.campaign.title);
      setTpl(data.template_body);
      setRows(data.recipients);
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "تعذر التحميل.");
    }
  }

  async function pollProgress(cid: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/campaigns/${cid}/send`);
      const data = await res.json();
      if (!res.ok) return false;
      if (!data.total) return false;
      setProgress(data);
      load(cid);
      return Boolean(data.running);
    } catch {
      return false;
    }
  }

  useEffect(() => {
    params.then((p) => {
      setId(p.id);
      load(p.id);
      // resume progress display if a background job is/was running
      pollProgress(p.id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  useEffect(() => {
    if (!progress?.running || !id) return;
    const t = setInterval(async () => {
      const still = await pollProgress(id);
      if (!still) clearInterval(t);
    }, 3000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress?.running, id]);

  async function mark(student_id: string, status: string) {
    await fetch(`/api/campaigns/${id}/recipients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_id, status }),
    });
    load(id);
  }

  async function sendAll() {
    const n = rows.filter((r) => r.status === "queued").length;
    if (!confirm(`بدء إرسال تلقائي لـ ${n} عبر تطبيق الأدمن (40 رسالة/دقيقة)؟ تقدر تقفل الصفحة وهو هيكمل.`)) return;
    setSending(true);
    setMsg("");
    try {
      const res = await fetch(`/api/campaigns/${id}/send`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "فشل الإرسال.");
      if (data.note) {
        setMsg(data.note);
      } else {
        setProgress({ running: true, sent: 0, failed: 0, total: data.total ?? n });
        setMsg("بدأ الإرسال في الخلفية — تقدر تقفل الصفحة.");
      }
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "فشل الإرسال.");
    } finally {
      setSending(false);
      load(id);
    }
  }

  const sent = rows.filter((r) => r.status === "sent" || r.status === "delivered").length;
  const queued = rows.filter((r) => r.status === "queued").length;

  return (
    <div>
      <PageHeader title={title || "الحملة"} sub={`${rows.length} مستلم · تم إرسال ${sent} · منتظر ${queued}`} actions={
        <>
          {queued > 0 && !progress?.running && (
            <button className="btn btn-gold btn-sm" onClick={sendAll} disabled={sending}>
              {sending ? "جارٍ البدء..." : `إرسال تلقائي للكل (${queued})`}
            </button>
          )}
          <a className="btn btn-outline btn-sm" href={`/api/campaigns/${id}/export`}>تنزيل Excel</a>
          <a className="btn btn-outline btn-sm" href="/communication">رجوع للحملات</a>
        </>
      } />
      {tpl && (
        <div className="card reveal" style={{ marginBottom: 14 }}>
          <h3>نص القالب</h3>
          <p style={{ whiteSpace: "pre-wrap", fontSize: 14 }}>{tpl}</p>
          <p className="section-sub" style={{ margin: "8px 0 0" }}>
            المتغيرات: {"{{name}}"} الاسم · {"{{code}}"} الكود · {"{{faculty}}"} الكلية · {"{{department}}"} القسم
          </p>
        </div>
      )}
      {msg && <div className="alert">{msg}</div>}
      {progress && progress.total > 0 && (
        <div className="card reveal" style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
            <span>{progress.running ? "جارٍ الإرسال في الخلفية..." : "اكتمل الإرسال"}</span>
            <span className="qr-ltr">{progress.sent + progress.failed}/{progress.total} · ✓ {progress.sent} · ✗ {progress.failed}</span>
          </div>
          <div style={{ height: 10, borderRadius: 6, background: "var(--navy-100)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.round(((progress.sent + progress.failed) / Math.max(progress.total, 1)) * 100)}%`, background: "var(--gold-500)", transition: "width .5s" }} />
          </div>
          {progress.error && <div className="meta" style={{ marginTop: 6, color: "#b42318" }}>{progress.error}</div>}
        </div>
      )}
      {rows.length === 0 && !msg ? (
        <Empty text="لا مستلمين — الجمهور المحدد فارغ." />
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {rows.map((r) => {
            const text = renderTpl(tpl, r);
            const wa = `https://wa.me/${toWaNumber(r.students?.phone ?? "")}?text=${encodeURIComponent(text)}`;
            const done = r.status === "sent" || r.status === "delivered";
            return (
              <div key={r.student_id} className="row-card" style={{ alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <strong>{r.students?.full_name}</strong>
                  <div className="meta qr-ltr">{r.students?.phone} · {r.students?.student_code}</div>
                  {tpl && <div className="meta" style={{ marginTop: 4, whiteSpace: "pre-wrap" }}>{text}</div>}
                </div>
                <div style={{ display: "flex", gap: 6, flexDirection: "column", alignItems: "end" }}>
                  <span className={`pill ${done ? "pill-green" : "pill-gold"}`}>
                    {done ? "تم الإرسال ✓" : "منتظر"}
                  </span>
                  {!done && (
                    <>
                      <a className="btn btn-navy btn-sm" href={wa} target="_blank" rel="noreferrer">
                        إرسال واتساب
                      </a>
                      <button className="btn btn-outline btn-sm" onClick={() => mark(r.student_id, "sent")}>
                        تعليم كمرسَل
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
