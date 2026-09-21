"use client";
import { useState } from "react";
import { ROLE_LABEL_AR } from "@/lib/roles";

export default function Login() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    setRole(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });
      // API must return JSON — if it returns HTML (server crash), show a clear message
      const text = await res.text();
      let data: { error?: string; role?: string };
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          res.status === 500
            ? "عطل في السيرفر (خطأ 500) — غالباً متغيرات البيئة ناقصة على الاستضافة. راجع إعدادات Vercel."
            : `استجابة غير متوقعة من السيرفر (${res.status}). حاول مجدداً.`,
        );
      }
      if (!res.ok) throw new Error(data.error ?? "تعذر الدخول.");
      setRole(data.role ?? null);
      const next = new URLSearchParams(window.location.search).get("next");
      window.location.href = next && next.startsWith("/") ? next : "/";
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "تعذر الدخول.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="reveal" style={{ display: "flex", justifyContent: "center" }}>
      <div className="form-card" style={{ width: "100%" }}>
        <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 900 }}>تسجيل الدخول</h1>
        <p className="section-sub">ادخل برقم الهاتف وكلمة السر.</p>
        <form onSubmit={submit}>
          <label className="label">
            رقم الهاتف
            <input className="input qr-ltr" value={phone} onChange={(e) => setPhone(e.target.value)}
              required inputMode="tel" />
          </label>
          <label className="label">
            كلمة السر
            <input className="input qr-ltr" type="password" value={password}
              onChange={(e) => setPassword(e.target.value)} required />
          </label>
          <button className="btn btn-navy" disabled={loading} style={{ width: "100%" }}>
            {loading ? "جارٍ الدخول..." : "دخول"}
          </button>
        </form>
        {msg && <div className="alert">{msg}</div>}
        {role && (
          <p style={{ marginTop: 12, fontSize: 14 }}>
            تم الدخول بدور: <strong>{ROLE_LABEL_AR[role as keyof typeof ROLE_LABEL_AR] ?? role}</strong>
          </p>
        )}
        <p style={{ marginTop: 14, fontSize: 14 }}>
          معندكش حساب؟ <a href="/register">سجّل هنا</a>
        </p>
      </div>
    </div>
  );
}
