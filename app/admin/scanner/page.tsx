"use client";
import { useEffect, useRef, useState } from "react";

interface Event {
  id: string;
  title: string;
  status: string;
  starts_at: string;
}

interface ScanLog {
  id: number;
  name: string;
  code: string;
  time: string;
  status: string;
  ok: boolean;
}

export default function ScannerPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [eventId, setEventId] = useState("");
  const [scanning, setScanning] = useState(false);
  const [manualToken, setManualToken] = useState("");
  const [log, setLog] = useState<ScanLog[]>([]);
  const [msg, setMsg] = useState("");
  const scannerRef = useRef<unknown>(null);
  const logIdRef = useRef(0);

  useEffect(() => {
    fetch("/api/admin/events")
      .then((r) => r.json())
      .then((d) => setEvents(d.events ?? []))
      .catch(() => {});
  }, []);

  async function checkIn(qrToken: string) {
    if (!eventId || !qrToken) return;
    try {
      const res = await fetch(`/api/events/${eventId}/check-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qr_token: qrToken }),
      });
      const data = await res.json();
      const entry: ScanLog = {
        id: ++logIdRef.current,
        name: data.student?.full_name ?? "—",
        code: qrToken,
        time: new Date().toLocaleTimeString("ar"),
        status: res.ok ? (data.status === "already_checked_in" ? "مُسجّل مسبقاً" : "تم التسجيل") : (data.error ?? "خطأ"),
        ok: res.ok,
      };
      setLog((prev) => [entry, ...prev].slice(0, 50));
      setMsg(entry.ok ? entry.status : data.error ?? "خطأ");
    } catch {
      const entry: ScanLog = {
        id: ++logIdRef.current,
        name: "—",
        code: qrToken,
        time: new Date().toLocaleTimeString("ar"),
        status: "خطأ في الاتصال",
        ok: false,
      };
      setLog((prev) => [entry, ...prev].slice(0, 50));
      setMsg("خطأ في الاتصال بالخادم.");
    }
  }

  async function startScanner() {
    if (!eventId) {
      setMsg("اختر فعالية أولاً.");
      return;
    }
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        (decodedText: string) => {
          checkIn(decodedText);
        },
        () => {}
      );
      setScanning(true);
      setMsg("جارٍ المسح...");
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "تعذر تشغيل الكاميرا.");
    }
  }

  async function stopScanner() {
    try {
      const scanner = scannerRef.current as { stop: () => Promise<void> } | null;
      if (scanner) {
        await scanner.stop();
        scannerRef.current = null;
      }
    } catch {}
    setScanning(false);
    setMsg("تم إيقاف السكانر.");
  }

  async function manualCheckIn(e: React.FormEvent) {
    e.preventDefault();
    const token = manualToken.trim();
    if (!token) return;
    await checkIn(token);
    setManualToken("");
  }

  return (
    <div>
      <div className="card reveal" style={{ marginBottom: 14 }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 900 }}>مسح QR — تسجيل حضور</h2>
        <p className="section-sub" style={{ margin: "0 0 14px" }}>اختر الفعالية ثم ابدأ مسح رموز QR أو أدخلها يدوياً.</p>
        <label className="label">
          الفعالية
          <select className="select" value={eventId} onChange={(e) => setEventId(e.target.value)}>
            <option value="">— اختر الفعالية —</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.title}</option>
            ))}
          </select>
        </label>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          {!scanning ? (
            <button className="btn btn-gold" onClick={startScanner} disabled={!eventId}>بدء السكانر</button>
          ) : (
            <button className="btn btn-danger" onClick={stopScanner}>إيقاف السكانر</button>
          )}
        </div>
        {msg && <div className="alert" style={{ marginTop: 10 }}>{msg}</div>}
      </div>

      <div className="card reveal reveal-1" style={{ marginBottom: 14 }}>
        <h3>إدخال يدوي</h3>
        <form onSubmit={manualCheckIn} style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <input className="input" style={{ marginTop: 0, flex: 1 }} value={manualToken}
            onChange={(e) => setManualToken(e.target.value)}
            placeholder=" الصق رمز QR هنا" required disabled={!eventId} />
          <button className="btn btn-navy btn-sm" disabled={!eventId}>تسجيل حضور</button>
        </form>
      </div>

      <div className="card reveal reveal-2">
        <h3>الكاميرا</h3>
        <div id="qr-reader" style={{ width: "100%", maxWidth: 400, marginTop: 10, borderRadius: 12, overflow: "hidden" }} />
      </div>

      {log.length > 0 && (
        <div className="card reveal reveal-3" style={{ marginTop: 14 }}>
          <h3>آخر عمليات المسح ({log.length})</h3>
          <div className="tbl-wrap" style={{ marginTop: 8, maxHeight: 400, overflowY: "auto" }}>
            <table className="tbl">
              <thead>
                <tr><th>الوقت</th><th>الاسم</th><th>الكود</th><th>الحالة</th></tr>
              </thead>
              <tbody>
                {log.map((l) => (
                  <tr key={l.id}>
                    <td className="qr-ltr">{l.time}</td>
                    <td><strong>{l.name}</strong></td>
                    <td className="qr-ltr">{l.code}</td>
                    <td>
                      <span className={`pill ${l.ok ? "pill-green" : ""}`}>
                        {l.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
