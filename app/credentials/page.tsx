"use client";
import { useEffect, useState } from "react";
import { PageHeader, Empty } from "@/components/ui";

interface CredItem {
  id: string;
  phone: string;
  message: string;
  status: string;
  error: string | null;
  created_at: string;
  sent_at: string | null;
  students: { full_name: string; student_code: string } | null;
}

interface Job {
  running: boolean;
  total: number;
  sent: number;
  failed: number;
  error: string | null;
}

export default function Credentials() {
  const [items, setItems] = useState<CredItem[]>([]);
  const [queued, setQueued] = useState(0);
  const [job, setJob] = useState<Job | null>(null);
  const [msg, setMsg] = useState("");
  const [starting, setStarting] = useState(false);

  async function load(): Promise<boolean> {
    try {
      const res = await fetch("/api/credentials");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "تعذر التحميل.");
      setItems(data.items ?? []);
      setQueued(data.queued ?? 0);
      setJob(data.job ?? null);
      return Boolean(data.job?.running);
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "تعذر التحميل.");
      return false;
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!job?.running) return;
    const t = setInterval(async () => {
      const still = await load();
      if (!still) clearInterval(t);
    }, 3000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.running]);

  async function sendAll() {
    if (!confirm(`إرسال بيانات الدخول لـ ${queued} طالب عبر تطبيق الأدمن؟ تقدر تقفل الصفحة وهو هيكمل.`)) return;
    setStarting(true);
    setMsg("");
    try {
      const res = await fetch("/api/credentials", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "فشل الإرسال.");
      if (data.note) setMsg(data.note);
      else {
        setJob({ running: true, total: data.total ?? queued, sent: 0, failed: 0, error: null });
        setMsg("بدأ الإرسال في الخلفية — تقدر تقفل الصفحة.");
      }
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "فشل الإرسال.");
    } finally {
      setStarting(false);
      load();
    }
  }

  const pending = items.filter((i) => i.status === "queued");
  const done = items.filter((i) => i.status !== "queued");

  return (
    <div>
      <PageHeader
        title="بيانات الدخول"
        sub={`${queued} رسالة منتظرة — كل حساب طالب يتعمل من الأدمن بيتجمع هنا لحد ما تبعته واتساب`}
        actions={
          <>
            {queued > 0 && !job?.running && (
              <button className="btn btn-gold btn-sm" onClick={sendAll} disabled={starting}>
                {starting ? "جارٍ البدء..." : `إرسال الكل واتساب (${queued})`}
              </button>
            )}
            <a className="btn btn-outline btn-sm" href="/students">سجل الطلبة</a>
          </>
        }
      />
      {msg && <div className="alert">{msg}</div>}
      {job && job.total > 0 && (
        <div className="card reveal" style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
            <span>{job.running ? "جارٍ الإرسال في الخلفية..." : "اكتمل الإرسال"}</span>
            <span className="qr-ltr">{job.sent + job.failed}/{job.total} · ✓ {job.sent} · ✗ {job.failed}</span>
          </div>
          <div style={{ height: 10, borderRadius: 6, background: "var(--navy-100)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.round(((job.sent + job.failed) / Math.max(job.total, 1)) * 100)}%`, background: "var(--gold-500)", transition: "width .5s" }} />
          </div>
          {job.error && <div className="meta" style={{ marginTop: 6, color: "#b42318" }}>{job.error}</div>}
        </div>
      )}
      {pending.length === 0 && !msg ? (
        <Empty text="لا رسائل منتظرة — بيانات دخول الطلبة الجدد هتظهر هنا." />
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {pending.map((c) => (
            <div key={c.id} className="row-card" style={{ alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <strong>{c.students?.full_name ?? "—"}</strong>
                <div className="meta qr-ltr">{c.phone} · {c.students?.student_code ?? ""}</div>
                <div className="meta" style={{ marginTop: 4, whiteSpace: "pre-wrap" }}>{c.message}</div>
              </div>
              <span className="pill pill-gold">منتظرة</span>
            </div>
          ))}
        </div>
      )}
      {done.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <h3>المرسلة ({done.length})</h3>
          <div style={{ display: "grid", gap: 10 }}>
            {done.slice(0, 50).map((c) => (
              <div key={c.id} className="row-card">
                <div style={{ flex: 1 }}>
                  <strong>{c.students?.full_name ?? "—"}</strong>
                  <div className="meta qr-ltr">{c.phone}</div>
                  {c.status === "failed" && c.error && (
                    <div className="meta" style={{ color: "#b42318" }}>{c.error}</div>
                  )}
                </div>
                <span className={`pill ${c.status === "sent" ? "pill-green" : ""}`}>
                  {c.status === "sent" ? "اتبعتت ✓" : "فشلت"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
