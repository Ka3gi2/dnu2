"use client";
import { useEffect, useState } from "react";
import { PageHeader, Empty } from "@/components/ui";

interface Student {
  id: string;
  student_code: string;
  full_name: string;
  academic_year: string | null;
  phone: string;
  faculties: { name: string } | null;
  departments: { name: string } | null;
}

export default function Students() {
  const [rows, setRows] = useState<Student[]>([]);
  const [faculties, setFaculties] = useState<{ id: string; name: string }[]>([]);
  const [q, setQ] = useState("");
  const [facultyId, setFacultyId] = useState("");
  const [msg, setMsg] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [years, setYears] = useState<{ id: string; label: string }[]>([]);
  const [fName, setFName] = useState("");
  const [fPhone, setFPhone] = useState("");
  const [fFaculty, setFFaculty] = useState("");
  const [fDept, setFDept] = useState("");
  const [fYear, setFYear] = useState("");
  const [fPass, setFPass] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetch("/api/faculties")
      .then((r) => r.json())
      .then((d) => setFaculties(d.faculties ?? []))
      .catch(() => {});
    fetch("/api/academic-years")
      .then((r) => r.json())
      .then((d) => setYears(d.years ?? d.academic_years ?? []))
      .catch(() => {});
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!fFaculty) { setDepartments([]); setFDept(""); return; }
    fetch(`/api/departments?faculty_id=${fFaculty}`)
      .then((r) => r.json())
      .then((d) => setDepartments(d.departments ?? []))
      .catch(() => {});
  }, [fFaculty]);

  async function load() {
    setMsg("");
    try {
      const params = new URLSearchParams();
      if (facultyId) params.set("faculty_id", facultyId);
      if (q) params.set("q", q);
      const qs = params.toString();
      const res = await fetch(`/api/admin/students${qs ? `?${qs}` : ""}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "تعذر التحميل.");
      setRows(data.students ?? []);
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "تعذر التحميل.");
    }
  }

  async function addStudent(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setAdding(true);
    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fName,
          phone: fPhone,
          faculty_id: fFaculty,
          department_id: fDept,
          academic_year: fYear || null,
          password: fPass || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "تعذر الإضافة.");
      setMsg(`تمت إضافة ${fName} — الكود: ${data.student_code} · الباسورد: ${data.password}`);
      setFName(""); setFPhone(""); setFFaculty(""); setFDept(""); setFYear(""); setFPass("");
      setShowAdd(false);
      load();
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "تعذر الإضافة.");
    } finally {
      setAdding(false);
    }
  }

  async function delStudent(id: string, name: string) {
    if (!confirm(`حذف حساب ${name} نهائياً؟ سيُحذف ملفه وحساب دخوله وكل سجلاته (حضور، حملات، استبيانات).`)) return;
    setMsg("");
    try {
      const res = await fetch(`/api/admin/students?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "تعذر الحذف.");
      setMsg("تم حذف الحساب نهائياً.");
      load();
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "تعذر الحذف.");
    }
  }

  return (
    <div>
      <PageHeader title="سجل الطلبة" sub="بحث بالاسم وفلترة بالكلية — اضغط على أي طالب لعرض ملفه." actions={
        <button className="btn btn-gold btn-sm" onClick={() => setShowAdd((v) => !v)}>
          {showAdd ? "إغلاق" : "+ إضافة طالب"}
        </button>
      } />
      {showAdd && (
        <form className="card reveal" style={{ marginBottom: 14, display: "grid", gap: 10 }} onSubmit={addStudent}>
          <h3 style={{ margin: 0 }}>إضافة طالب جديد</h3>
          <input className="input" value={fName} onChange={(e) => setFName(e.target.value)} placeholder="اسم الطالب *" required />
          <input className="input qr-ltr" value={fPhone} onChange={(e) => setFPhone(e.target.value)} placeholder="رقم الواتساب * (01xxxxxxxxx)" required />
          <div className="grid-2">
            <select className="select" value={fFaculty} onChange={(e) => setFFaculty(e.target.value)} required>
              <option value="">الكلية *</option>
              {faculties.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            <select className="select" value={fDept} onChange={(e) => setFDept(e.target.value)} required>
              <option value="">التخصص *</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div className="grid-2">
            <select className="select" value={fYear} onChange={(e) => setFYear(e.target.value)}>
              <option value="">السنة الدراسية (اختياري)</option>
              {years.map((y) => (
                <option key={y.id} value={y.label}>{y.label}</option>
              ))}
            </select>
            <input className="input" value={fPass} onChange={(e) => setFPass(e.target.value)} placeholder="الباسورد (افتراضي: رقم الواتساب)" />
          </div>
          <button className="btn btn-navy" disabled={adding}>{adding ? "جارٍ الإضافة..." : "حفظ الطالب"}</button>
        </form>
      )}
      <div className="toolbar reveal">
        <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث بالاسم" />
        <select className="select" value={facultyId} onChange={(e) => setFacultyId(e.target.value)}>
          <option value="">كل الكليات</option>
          {faculties.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
        <button className="btn btn-navy" onClick={load}>بحث</button>
        <a
          className="btn btn-outline"
          href={`/api/admin/students/export?${new URLSearchParams({ ...(facultyId ? { faculty_id: facultyId } : {}), ...(q ? { q } : {}) }).toString()}`}
        >
          تنزيل Excel
        </a>
      </div>
      {msg && <div className="alert">{msg}</div>}
      {rows.length === 0 && !msg ? (
        <Empty text="لا نتائج — جرّب بحثاً مختلفاً." />
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {rows.map((s, i) => (
            <div key={s.id} className={`row-card reveal reveal-${(i % 4) + 1}`}>
              <a href={`/students/${s.id}`} style={{ flex: 1, display: "flex", gap: 12, alignItems: "center", color: "inherit", textDecoration: "none" }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--navy-100)", color: "var(--navy-800)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, flexShrink: 0 }}>
                  {s.full_name.trim().charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                  <strong>{s.full_name}</strong>
                  <div className="meta">
                    {s.faculties?.name ?? "—"} · {s.departments?.name ?? "—"} · سنة {s.academic_year ?? "—"}
                  </div>
                  <div className="meta qr-ltr">{s.student_code} · {s.phone}</div>
                </div>
                <span className="pill">عرض الملف</span>
              </a>
              <button className="btn btn-outline btn-sm" style={{ color: "#b42318", borderColor: "#f1b0aa" }} onClick={() => delStudent(s.id, s.full_name)}>
                حذف
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
