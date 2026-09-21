"use client";
import { useEffect, useState } from "react";

const INTERESTS = [
  { key: "sports", emoji: "⚽", label: "رياضة" },
  { key: "art", emoji: "🎨", label: "فن" },
  { key: "tech", emoji: "💻", label: "تكنولوجيا" },
  { key: "science", emoji: "🔬", label: "علوم" },
  { key: "media", emoji: "🎤", label: "إعلام" },
  { key: "culture", emoji: "📚", label: "ثقافة" },
  { key: "volunteer", emoji: "🤝", label: "تطوع" },
  { key: "entrepreneurship", emoji: "🚀", label: "ريادة أعمال" },
];

export default function EditProfile() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [level, setLevel] = useState("");
  const [enrollmentYear, setEnrollmentYear] = useState("");
  const [studentStatus, setStudentStatus] = useState("current");
  const [interests, setInterests] = useState<string[]>([]);
  const [studentId, setStudentId] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(async d => {
      if (!d.student_id) return;
      setStudentId(d.student_id);
      const res = await fetch("/api/profile");
      const data = await res.json();
      const s = data.student;
      if (!s) return;
      setFullName(s.full_name ?? "");
      setEmail(s.email ?? "");
      setGender(s.gender ?? "");
      setBirthDate(s.birth_date ?? "");
      setLevel(s.level?.toString() ?? "");
      setEnrollmentYear(s.enrollment_year?.toString() ?? "");
      setStudentStatus(s.student_status ?? "current");
      setInterests(s.interests ?? []);
    }).catch(() => {});
  }, []);

  function toggleInterest(key: string) {
    setInterests(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          email: email || null,
          gender: gender || null,
          birth_date: birthDate || null,
          level: level ? Number(level) : null,
          enrollment_year: enrollmentYear ? Number(enrollmentYear) : null,
          student_status: studentStatus,
          interests,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "تعذر التحديث.");
      setMsg("تم حفظ التغييرات بنجاح.");
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "تعذر التحديث.");
    } finally {
      setLoading(false);
    }
  }

  if (!studentId) return <p style={{ textAlign: "center", padding: 40 }}>جارٍ التحميل...</p>;

  return (
    <div style={{ maxWidth: 520, margin: "0 auto" }}>
      <div className="form-card reveal">
        <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 900 }}>تعديل الملف الشخصي</h1>
        <p className="section-sub">حدّث بياناتك واهتماماتك.</p>
        <form onSubmit={submit}>
          <label className="label">
            الاسم الكامل
            <input className="input" value={fullName} onChange={e => setFullName(e.target.value)} required />
          </label>
          <label className="label">
            البريد الجامعي
            <input className="input qr-ltr" type="email" value={email} onChange={e => setEmail(e.target.value)} />
          </label>
          <div className="grid-2" style={{ gap: 12 }}>
            <label className="label">
              النوع
              <select className="select" value={gender} onChange={e => setGender(e.target.value)}>
                <option value="">—</option>
                <option value="male">ذكر</option>
                <option value="female">أنثى</option>
              </select>
            </label>
            <label className="label">
              تاريخ الميلاد
              <input className="input qr-ltr" type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} />
            </label>
          </div>
          <div className="grid-2" style={{ gap: 12 }}>
            <label className="label">
              المستوى الدراسي
              <select className="select" value={level} onChange={e => setLevel(e.target.value)}>
                <option value="">—</option>
                <option value="1">الأول</option>
                <option value="2">الثاني</option>
                <option value="3">الثالث</option>
                <option value="4">الرابع</option>
                <option value="5">الخامس</option>
              </select>
            </label>
            <label className="label">
              سنة الالتحاق
              <input className="input qr-ltr" type="number" min={2020} max={2030}
                value={enrollmentYear} onChange={e => setEnrollmentYear(e.target.value)} />
            </label>
          </div>
          <label className="label">حالة الطالب</label>
          <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
            {[
              { v: "current", l: "طالب حالي" },
              { v: "graduated", l: "خريج" },
            ].map(o => (
              <button key={o.v} type="button" onClick={() => setStudentStatus(o.v)}
                className={`interest-chip ${studentStatus === o.v ? "selected" : ""}`}>
                {o.l}
              </button>
            ))}
          </div>
          <label className="label">الاهتمامات</label>
          <div className="interest-chips" style={{ marginBottom: 12 }}>
            {INTERESTS.map(i => (
              <button key={i.key} type="button" onClick={() => toggleInterest(i.key)}
                className={`interest-chip ${interests.includes(i.key) ? "selected" : ""}`}>
                {i.emoji} {i.label}
              </button>
            ))}
          </div>
          {msg && <div className="alert">{msg}</div>}
          <button className="btn btn-navy" disabled={loading} style={{ width: "100%", marginTop: 12 }}>
            {loading ? "جارٍ الحفظ..." : "حفظ التغييرات"}
          </button>
        </form>
      </div>
    </div>
  );
}
