"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader, Empty } from "@/components/ui";

interface Ev {
  id: string;
  title: string;
  location: string | null;
  starts_at: string;
  status: string;
}

const STATUS_AR: Record<string, string> = {
  draft: "مسودة",
  published: "منشورة",
  closed: "مغلقة",
  cancelled: "ملغاة",
};

const STAFF_ROLES = ["super_admin", "president", "event_manager", "committee_head"];

export default function Events() {
  const [rows, setRows] = useState<Ev[]>([]);
  const [mine, setMine] = useState<string[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    load();
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setRole(d?.user?.role ?? null))
      .catch(() => {});
    fetch("/api/events/mine")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setMine(d?.event_ids ?? []))
      .catch(() => {});
  }, []);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase
      .from("events")
      .select("id,title,location,starts_at,status")
      .order("starts_at", { ascending: true })
      .limit(100);
    setRows(data ?? []);
  }

  async function createEvent(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    try {
      const supabase = createClient();
      const { error } = await supabase.from("events").insert({
        title,
        location: location || null,
        starts_at: new Date(startsAt).toISOString(),
        status: "published",
      });
      if (error) throw error;
      setMsg("تم نشر الفعالية.");
      setTitle("");
      setLocation("");
      setStartsAt("");
      load();
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "تعذر الإنشاء.");
    }
  }

  async function register(id: string) {
    setMsg("");
    try {
      const res = await fetch(`/api/events/${id}/register`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "تعذر التسجيل.");
      setMine([...mine, id]);
      setMsg("تم تسجيلك في الفعالية.");
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "تعذر التسجيل.");
    }
  }

  async function sendSheet(id: string, title: string) {
    const to = prompt(`إرسال شيت "${title}" واتساب إلى أي رقم؟ (مثال 01xxxxxxxxx)`);
    if (!to) return;
    setMsg("");
    try {
      const res = await fetch(`/api/admin/events/${id}/send-sheet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "تعذر الإرسال.");
      setMsg(`تم إرسال الشيت واتساب (${data.count} مسجل).`);
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "تعذر الإرسال.");
    }
  }

  const canManage = role !== null && STAFF_ROLES.includes(role);

  return (
    <div>
      <PageHeader title="الفعاليات" sub={canManage ? "انشر فعالية جديدة وتابع القادم منها." : "سجّل في الفعاليات بضغطة واحدة."} />

      {canManage && (
        <div className="card reveal" style={{ maxWidth: 640 }}>
          <h3>فعالية جديدة</h3>
          <form onSubmit={createEvent} style={{ marginTop: 12 }}>
            <label className="label">
              عنوان الفعالية
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </label>
            <label className="label">
              المكان
              <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} />
            </label>
            <label className="label">
              الموعد
              <input className="input qr-ltr" type="datetime-local" value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)} required />
            </label>
            <button className="btn btn-gold">نشر الفعالية</button>
          </form>
          {msg && <div className="alert">{msg}</div>}
        </div>
      )}

      <h2 className="section-title">القادم</h2>
      {msg && !canManage && <div className="alert" style={{ marginBottom: 12 }}>{msg}</div>}
      {rows.length === 0 ? (
        <Empty text="لا فعاليات بعد." />
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {rows.map((ev, i) => {
            const registered = mine.includes(ev.id);
            return (
              <div key={ev.id} className={`row-card reveal reveal-${(i % 4) + 1}`}>
                <div style={{ width: 52, textAlign: "center", flexShrink: 0, background: "var(--navy-800)", color: "#fff", borderRadius: 12, padding: "8px 4px" }}>
                  <div style={{ fontSize: 20, fontWeight: 900, lineHeight: 1 }}>
                    {new Date(ev.starts_at).getDate()}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--gold-400)" }}>
                    {new Date(ev.starts_at).toLocaleDateString("ar", { month: "short" })}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <strong>{ev.title}</strong>
                  <div className="meta">{ev.location ?? "بدون مكان"} · {new Date(ev.starts_at).toLocaleString("ar")}</div>
                </div>
                {registered ? (
                  <span className="pill pill-green">مسجل ✓</span>
                ) : ev.status === "published" ? (
                  <button className="btn btn-navy btn-sm" onClick={() => register(ev.id)}>سجّل الآن</button>
                ) : (
                  <span className="pill">{STATUS_AR[ev.status] ?? ev.status}</span>
                )}
                {canManage && (
                  <div style={{ display: "flex", gap: 6 }}>
                    <a className="btn btn-outline btn-sm" href={`/api/admin/events/${ev.id}/export`}>Excel</a>
                    <button className="btn btn-outline btn-sm" onClick={() => sendSheet(ev.id, ev.title)}>واتساب</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
