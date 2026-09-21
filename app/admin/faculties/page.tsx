"use client";
import { useEffect, useState } from "react";
import { PageHeader, Empty } from "@/components/ui";

interface Faculty {
  id: string;
  name: string;
  is_active: boolean;
}
interface Department {
  id: string;
  faculty_id: string;
  name: string;
  is_active: boolean;
}
interface AcademicYear {
  id: string;
  faculty_id: string;
  name: string;
  is_active: boolean;
}

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "خطأ غير متوقع.");
  return data;
}

export default function FacultiesAdmin() {
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [newFac, setNewFac] = useState("");
  const [newDep, setNewDep] = useState<Record<string, string>>({});
  const [newYear, setNewYear] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");

  async function load() {
    try {
      const f = await api("/api/admin/faculties");
      setFaculties(f.faculties);
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "تعذر تحميل الكليات.");
    }
    try {
      const d = await api("/api/admin/departments");
      setDepartments(d.departments);
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "تعذر تحميل الأقسام.");
    }
    try {
      const y = await api("/api/admin/academic-years");
      setAcademicYears(y.years);
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "تعذر تحميل السنوات الدراسية.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function addFaculty(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    try {
      await api("/api/admin/faculties", { method: "POST", body: JSON.stringify({ name: newFac }) });
      setNewFac("");
      setMsg("تمت إضافة الكلية بنجاح.");
      load();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "تعذر الإضافة.");
    }
  }

  async function addDepartment(faculty_id: string) {
    setMsg("");
    try {
      const name = (newDep[faculty_id] ?? "").trim();
      if (!name) return;
      await api("/api/admin/departments", {
        method: "POST",
        body: JSON.stringify({ faculty_id, name }),
      });
      setNewDep({ ...newDep, [faculty_id]: "" });
      setMsg("تمت إضافة القسم بنجاح.");
      load();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "تعذر الإضافة.");
    }
  }

  async function toggleFaculty(f: Faculty) {
    try {
      await api(`/api/admin/faculties/${f.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !f.is_active }),
      });
      load();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "خطأ.");
    }
  }

  async function deleteFaculty(f: Faculty) {
    try {
      await api(`/api/admin/faculties/${f.id}`, { method: "DELETE" });
      load();
    } catch (e: unknown) {
      const msgText = e instanceof Error ? e.message : "تعذر الحذف.";
      if (msgText.includes("أقسام أو طلبة مرتبطين")) {
        if (!confirm(`حذف كلية "${f.name}" مع جميع أقسامها؟ سيتم حذف الأقسام أولاً.`)) return;
        try {
          const deps = departments.filter((d) => d.faculty_id === f.id);
          for (const dep of deps) {
            await api(`/api/admin/departments/${dep.id}`, { method: "DELETE" });
          }
          await api(`/api/admin/faculties/${f.id}`, { method: "DELETE" });
          setMsg("تم حذف الكلية وأقسامها بنجاح.");
          load();
        } catch (e2: unknown) {
          setMsg(e2 instanceof Error ? e2.message : "تعذر الحذف.");
        }
      } else {
        setMsg(msgText);
      }
    }
  }

  async function toggleDep(d: Department) {
    try {
      await api(`/api/admin/departments/${d.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !d.is_active }),
      });
      load();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "خطأ.");
    }
  }

  async function deleteDep(d: Department) {
    if (!confirm(`حذف قسم "${d.name}"؟`)) return;
    try {
      await api(`/api/admin/departments/${d.id}`, { method: "DELETE" });
      load();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "تعذر الحذف.");
    }
  }

  async function addYear(faculty_id: string) {
    setMsg("");
    try {
      const name = (newYear[faculty_id] ?? "").trim();
      if (!name) return;
      await api("/api/admin/academic-years", {
        method: "POST",
        body: JSON.stringify({ faculty_id, name }),
      });
      setNewYear({ ...newYear, [faculty_id]: "" });
      setMsg("تمت إضافة السنة الدراسية بنجاح.");
      load();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "تعذر الإضافة.");
    }
  }

  async function toggleYear(y: AcademicYear) {
    try {
      await api(`/api/admin/academic-years/${y.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !y.is_active }),
      });
      load();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "خطأ.");
    }
  }

  async function deleteYear(y: AcademicYear) {
    if (!confirm(`حذف سنة "${y.name}"؟`)) return;
    try {
      await api(`/api/admin/academic-years/${y.id}`, { method: "DELETE" });
      load();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "تعذر الحذف.");
    }
  }

  return (
    <div>
      <PageHeader title="الكليات والأقسام" sub="المعطّل منها يختفي تلقائياً من قوائم التسجيل." />
      <div className="card reveal" style={{ marginBottom: 14 }}>
        <form onSubmit={addFaculty} style={{ display: "flex", gap: 8 }}>
          <input className="input" style={{ marginTop: 0, flex: 1 }} value={newFac}
            onChange={(e) => setNewFac(e.target.value)} placeholder="اسم كلية جديدة — مثال: الهندسة" required />
          <button className="btn btn-navy">إضافة كلية</button>
        </form>
      </div>
      {msg && <div className="alert" style={{ marginBottom: 14 }}>{msg}</div>}
      {faculties.length === 0 ? (
        <Empty text="لا كليات بعد — ضيف أول كلية من الأعلى." />
      ) : (
        faculties.map((f) => {
          const deps = departments.filter((d) => d.faculty_id === f.id);
          const yearsList = academicYears.filter((y) => y.faculty_id === f.id);
          return (
            <div key={f.id} className="card reveal" style={{ marginBottom: 14, opacity: f.is_active ? 1 : 0.7 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <strong style={{ fontSize: 16 }}>{f.name}</strong>
                <span className={`pill ${f.is_active ? "pill-green" : ""}`}>
                  {f.is_active ? `مفعّلة · ${deps.length} قسم · ${yearsList.length} سنة` : "معطّلة"}
                </span>
                <span style={{ flex: 1 }} />
                <button className="btn btn-outline btn-sm" onClick={() => toggleFaculty(f)}>
                  {f.is_active ? "تعطيل" : "تفعيل"}
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => deleteFaculty(f)}>حذف</button>
              </div>
              <div className="tbl-wrap" style={{ marginTop: 12 }}>
                <table className="tbl">
                  <thead>
                    <tr><th>القسم / التخصص</th><th>الحالة</th><th style={{ width: 190 }}>إجراءات</th></tr>
                  </thead>
                  <tbody>
                    {deps.map((d) => (
                      <tr key={d.id}>
                        <td><strong>{d.name}</strong></td>
                        <td>
                          <span className={`pill ${d.is_active ? "pill-green" : ""}`}>
                            {d.is_active ? "مفعّل" : "معطّل"}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button className="btn btn-outline btn-sm" onClick={() => toggleDep(d)}>
                              {d.is_active ? "تعطيل" : "تفعيل"}
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => deleteDep(d)}>حذف</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {deps.length === 0 && (
                      <tr><td colSpan={3} style={{ color: "var(--muted)" }}>لا أقسام بعد.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <input className="input" style={{ marginTop: 0, flex: 1 }} value={newDep[f.id] ?? ""}
                  onChange={(e) => setNewDep({ ...newDep, [f.id]: e.target.value })}
                  placeholder="قسم / تخصص جديد — مثال: هندسة البرمجيات" />
                <button className="btn btn-outline btn-sm" onClick={() => addDepartment(f.id)}>إضافة قسم</button>
              </div>

              <div style={{ borderTop: "1px solid var(--border, #e5e7eb)", marginTop: 14, paddingTop: 14 }}>
                <strong style={{ fontSize: 14 }}>السنوات الدراسية</strong>
                <div className="tbl-wrap" style={{ marginTop: 8 }}>
                  <table className="tbl">
                    <thead>
                      <tr><th>السنة</th><th>الحالة</th><th style={{ width: 190 }}>إجراءات</th></tr>
                    </thead>
                    <tbody>
                      {yearsList.map((y) => (
                        <tr key={y.id}>
                          <td><strong>{y.name}</strong></td>
                          <td>
                            <span className={`pill ${y.is_active ? "pill-green" : ""}`}>
                              {y.is_active ? "مفعّلة" : "معطّلة"}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: 6 }}>
                              <button className="btn btn-outline btn-sm" onClick={() => toggleYear(y)}>
                                {y.is_active ? "تعطيل" : "تفعيل"}
                              </button>
                              <button className="btn btn-danger btn-sm" onClick={() => deleteYear(y)}>حذف</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {yearsList.length === 0 && (
                        <tr><td colSpan={3} style={{ color: "var(--muted)" }}>لا سنوات دراسية بعد.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <input className="input" style={{ marginTop: 0, flex: 1 }} value={newYear[f.id] ?? ""}
                    onChange={(e) => setNewYear({ ...newYear, [f.id]: e.target.value })}
                    placeholder="سنة دراسية جديدة — مثال: الأولى" />
                  <button className="btn btn-outline btn-sm" onClick={() => addYear(f.id)}>إضافة سنة</button>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
