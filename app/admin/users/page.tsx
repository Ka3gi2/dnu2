"use client";
import { useEffect, useState } from "react";
import { ROLES, ROLE_LABEL_AR } from "@/lib/roles";
import { PageHeader, Empty } from "@/components/ui";

interface U {
  id: string;
  phone: string;
  email: string | null;
  role: string;
  is_active: boolean;
  students: { full_name: string } | null;
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

export default function UsersAdmin() {
  const [users, setUsers] = useState<U[]>([]);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("volunteer");
  const [msg, setMsg] = useState("");

  async function load() {
    try {
      const d = await api("/api/admin/users");
      setUsers(d.users);
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "تعذر التحميل.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    try {
      await api("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({ phone, password, role }),
      });
      setPhone("");
      setPassword("");
      load();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "تعذر الإضافة.");
    }
  }

  async function setRoleOf(u: U, r: string) {
    try {
      await api(`/api/admin/users/${u.id}`, { method: "PATCH", body: JSON.stringify({ role: r }) });
      load();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "تعذر التحديث.");
    }
  }

  async function setActive(u: U, active: boolean) {
    try {
      await api(`/api/admin/users/${u.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: active }),
      });
      load();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "تعذر التحديث.");
    }
  }

  async function resetPassword(u: U) {
    const pw = prompt(`باسورد جديد لـ ${u.phone} (6 حروف على الأقل):`);
    if (!pw) return;
    try {
      await api(`/api/admin/users/${u.id}`, {
        method: "PATCH",
        body: JSON.stringify({ password: pw }),
      });
      setMsg("تم تغيير الباسورد.");
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "تعذر التغيير.");
    }
  }

  return (
    <div>
      <PageHeader title="المسؤولون" sub="إضافة مسؤول برقم الهاتف والدور — وتعديل الصلاحيات والحالة." />
      <div className="card reveal" style={{ marginBottom: 14 }}>
        <form onSubmit={create} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
          <label className="label" style={{ margin: 0, minWidth: 150, flex: 1 }}>
            رقم الهاتف
            <input className="input qr-ltr" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </label>
          <label className="label" style={{ margin: 0, minWidth: 150, flex: 1 }}>
            الباسورد
            <input className="input qr-ltr" type="password" value={password}
              onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </label>
          <label className="label" style={{ margin: 0, minWidth: 170 }}>
            الدور
            <select className="select" value={role} onChange={(e) => setRole(e.target.value)}>
              {ROLES.filter((r) => r !== "student").map((r) => (
                <option key={r} value={r}>{ROLE_LABEL_AR[r]}</option>
              ))}
            </select>
          </label>
          <button className="btn btn-navy">إضافة مسؤول</button>
        </form>
      </div>
      {msg && <div className="alert" style={{ marginBottom: 14 }}>{msg}</div>}
      {users.length === 0 ? (
        <Empty text="لا مسؤولين بعد." />
      ) : (
        <div className="tbl-wrap reveal">
          <table className="tbl">
            <thead>
              <tr><th>المسؤول</th><th>الدور</th><th>الحالة</th><th style={{ width: 220 }}>إجراءات</th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ opacity: u.is_active ? 1 : 0.6 }}>
                  <td>
                    <div className="qr-ltr" style={{ fontWeight: 800 }}>{u.phone}</div>
                    <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{u.students?.full_name ?? "بدون اسم مرتبط"}</div>
                  </td>
                  <td>
                    <select className="select" style={{ marginTop: 0, width: "auto", padding: "7px 10px" }}
                      value={u.role} onChange={(e) => setRoleOf(u, e.target.value)}>
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{ROLE_LABEL_AR[r]}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <span className={`pill ${u.is_active ? "pill-green" : "pill-red"}`}>
                      {u.is_active ? "نشط" : "معطّل"}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button className="btn btn-outline btn-sm" onClick={() => setActive(u, !u.is_active)}>
                        {u.is_active ? "تعطيل" : "تفعيل"}
                      </button>
                      <button className="btn btn-outline btn-sm" onClick={() => resetPassword(u)}>باسورد جديد</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
