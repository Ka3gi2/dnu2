"use client";
import { useState } from "react";

interface Props {
  isLoggedIn: boolean;
  isStudent: boolean;
  studentId: string | null;
  isAdmin: boolean;
  role: string;
}

export default function MobileMenu({ isLoggedIn, isStudent, studentId, isAdmin, role }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="mobile-menu-btn" onClick={() => setOpen(!open)} aria-label="القائمة">
        <span className={`hamburger ${open ? "open" : ""}`} />
      </button>
      {open && (
        <div className="mobile-overlay" onClick={() => setOpen(false)}>
          <div className="mobile-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-drawer-header">
              <strong>القائمة</strong>
              <button onClick={() => setOpen(false)} className="btn btn-outline btn-sm">إغلاق</button>
            </div>
            <nav className="mobile-nav">
              <a href="/" onClick={() => setOpen(false)}>الرئيسية</a>
              {isLoggedIn && isStudent && (
                <>
                  <a href="/events" onClick={() => setOpen(false)}>الفعاليات</a>
                  <a href="/surveys" onClick={() => setOpen(false)}>الاستبيانات</a>
                  {studentId && <a href={`/students/${studentId}`} onClick={() => setOpen(false)}>ملفي</a>}
                </>
              )}
              {isLoggedIn && isAdmin && (
                <>
                  <a href="/admin" onClick={() => setOpen(false)}>نظرة عامة</a>
                  <a href="/students" onClick={() => setOpen(false)}>الطلبة</a>
                  {["super_admin", "president", "committee_head"].includes(role) && (
                    <a href="/credentials" onClick={() => setOpen(false)}>بيانات الدخول</a>
                  )}
                  <a href="/events" onClick={() => setOpen(false)}>الفعاليات</a>
                  <a href="/communication" onClick={() => setOpen(false)}>التواصل</a>
                  {["super_admin", "president"].includes(role) && (
                    <>
                      <a href="/admin/faculties" onClick={() => setOpen(false)}>الكليات والأقسام</a>
                      <a href="/admin/users" onClick={() => setOpen(false)}>المسؤولون</a>
                      <a href="/admin/scanner" onClick={() => setOpen(false)}>السكانر</a>
                    </>
                  )}
                </>
              )}
              {!isLoggedIn && (
                <>
                  <a href="/events" onClick={() => setOpen(false)}>الفعاليات</a>
                  <a href="/register" onClick={() => setOpen(false)}>حساب جديد</a>
                  <a href="/login" onClick={() => setOpen(false)}>تسجيل الدخول</a>
                </>
              )}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
