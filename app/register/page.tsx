"use client";
import { useEffect, useState } from "react";

interface Opt { id: string; name: string; }

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

export default function Register() {
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [faculties, setFaculties] = useState<Opt[]>([]);
  const [departments, setDepartments] = useState<Opt[]>([]);
  const [years, setYears] = useState<Opt[]>([]);
  const [facultyId, setFacultyId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [level, setLevel] = useState("");
  const [enrollmentYear, setEnrollmentYear] = useState("");
  const [studentStatus, setStudentStatus] = useState("current");
  const [interests, setInterests] = useState<string[]>([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/faculties").then(r => r.json()).then(d => setFaculties(d.faculties ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    setDepartmentId("");
    setAcademicYear("");
    if (!facultyId) { setDepartments([]); setYears([]); return; }
    fetch(`/api/departments?faculty_id=${facultyId}`).then(r => r.json()).then(d => setDepartments(d.departments ?? [])).catch(() => {});
    fetch(`/api/academic-years?faculty_id=${facultyId}`).then(r => r.json()).then(d => setYears(d.years ?? [])).catch(() => {});
  }, [facultyId]);

  function toggleInterest(key: string) {
    setInterests(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  }

  function canNext(): boolean {
    if (step === 1) return fullName.trim().length > 0 && phone.trim().length > 0 && password.length >= 6;
    if (step === 2) return !!facultyId && !!departmentId && !!academicYear;
    return interests.length > 0;
  }

  async function submit() {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          phone,
          password,
          email: email || undefined,
          faculty_id: facultyId,
          department_id: departmentId,
          academic_year: academicYear,
          level: level ? Number(level) : undefined,
          enrollment_year: enrollmentYear ? Number(enrollmentYear) : undefined,
          student_status: studentStatus,
          interests,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "تعذر التسجيل.");
      window.location.href = "/";
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "تعذر التسجيل.");
    } finally {
      setLoading(false);
    }
  }

  const stepTitles = ["أخبرنا عنك", "جامعتك", "اهتماماتك"];
  const stepSubs = ["ابدأ بالبيانات الأساسية", "اختار كليةك وقسمك", "اختار اهتماماتك عشان نخصص تجربتك"];

  return (
    <div className="reveal" style={{ display: "flex", justifyContent: "center", padding: "20px 0" }}>
      <div className="wizard-card">
        <div className="wizard-steps">
          {[1, 2, 3].map(s => (
            <div key={s} className={`wizard-step-dot ${s === step ? "active" : s < step ? "done" : ""}`} />
          ))}
        </div>

        <h1 className="wizard-title">{stepTitles[step - 1]}</h1>
        <p className="wizard-sub">{stepSubs[step - 1]} — الخطوة {step}/3</p>

        {step === 1 && (
          <div className="wizard-fields">
            <label className="label">
              الاسم الكامل
              <input className="input" value={fullName} onChange={e => setFullName(e.target.value)} required />
            </label>
            <label className="label">
              رقم الواتساب
              <input className="input qr-ltr" value={phone} onChange={e => setPhone(e.target.value)}
                required inputMode="tel" placeholder="01xxxxxxxxx" />
            </label>
            <label className="label">
              البريد الجامعي (اختياري)
              <input className="input qr-ltr" type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="name@university.edu" />
            </label>
            <label className="label">
              كلمة السر (6 حروف على الأقل)
              <input className="input qr-ltr" type="password" value={password}
                onChange={e => setPassword(e.target.value)} required minLength={6} />
            </label>
          </div>
        )}

        {step === 2 && (
          <div className="wizard-fields">
            <label className="label">
              الكلية *
              <select className="select" value={facultyId} onChange={e => setFacultyId(e.target.value)} required>
                <option value="">— اختر الكلية —</option>
                {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </label>
            <label className="label">
              القسم / التخصص *
              <select className="select" value={departmentId} onChange={e => setDepartmentId(e.target.value)}
                required disabled={!facultyId}>
                <option value="">— اختر القسم —</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </label>
            <label className="label">
              الفرقة *
              <select className="select" value={academicYear} onChange={e => setAcademicYear(e.target.value)}
                required disabled={!facultyId}>
                <option value="">— اختر الفرقة —</option>
                {years.map(y => <option key={y.id} value={y.name}>{y.name}</option>)}
              </select>
            </label>
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
                  value={enrollmentYear} onChange={e => setEnrollmentYear(e.target.value)}
                  placeholder="2024" />
              </label>
            </div>
            <label className="label">حالة الطالب</label>
            <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
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
          </div>
        )}

        {step === 3 && (
          <div>
            <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 16 }}>
              اختار اهتماماتك — اختار حاجة واحدة على الأقل:
            </p>
            <div className="interest-chips">
              {INTERESTS.map(i => (
                <button key={i.key} type="button" onClick={() => toggleInterest(i.key)}
                  className={`interest-chip ${interests.includes(i.key) ? "selected" : ""}`}>
                  {i.emoji} {i.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {msg && <div className="alert" style={{ marginTop: 12 }}>{msg}</div>}

        <div className="wizard-nav">
          {step > 1 && (
            <button type="button" className="btn btn-outline" onClick={() => setStep(s => s - 1)}>
              رجوع
            </button>
          )}
          {step < 3 ? (
            <button type="button" className="btn btn-navy" disabled={!canNext()}
              onClick={() => setStep(s => s + 1)}>
              التالي
            </button>
          ) : (
            <button type="button" className="btn btn-navy" disabled={!canNext() || loading}
              onClick={submit}>
              {loading ? "جارٍ إنشاء الحساب..." : "إنشاء الحساب"}
            </button>
          )}
        </div>

        <p style={{ marginTop: 16, fontSize: 14, textAlign: "center" }}>
          عندك حساب؟ <a href="/login">ادخل من هنا</a>
        </p>
      </div>
    </div>
  );
}
