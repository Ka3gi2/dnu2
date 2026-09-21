import type { Metadata } from "next";
import "./globals.css";
import { readSessionFresh } from "@/lib/auth";
import { ROLE_LABEL_AR } from "@/lib/roles";
import { createServiceClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/LogoutButton";
import AdminNav from "@/components/admin/AdminNav";
import Logo from "@/components/Logo";
import Loader from "@/components/Loader";
import MobileMenu from "@/components/MobileMenu";

export const metadata: Metadata = {
  title: "اتحاد طلاب جامعة دمنهور الأهلية",
  description: "منظومة اتحاد الطلاب — التسجيل والفعاليات والتواصل",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await readSessionFresh();
  const isStudent = session?.role === "student";
  let studentId: string | null = null;
  if (isStudent && session) {
    const svc = createServiceClient();
    const { data } = await svc.from("users").select("student_id").eq("id", session.uid).single();
    studentId = data?.student_id ?? null;
  }
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="icon" type="image/webp" href="/logo.webp" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Almarai:wght@300;400;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>
        <Loader />
        <header className="site-header">
          <div className="bar">
            <Logo size={50} />
            <div className="brand-name">
              اتحاد الطلاب
              <small>جامعة دمنهور الأهلية</small>
            </div>
            <nav className="nav-links desktop-only">
              <a href="/">الرئيسية</a>
              {isStudent && (
                <>
                  <a href="/events">الفعاليات</a>
                  <a href="/surveys">الاستبيانات</a>
                  {studentId && <a href={`/students/${studentId}`}>ملفي</a>}
                </>
              )}
            </nav>
            <span style={{ flex: 1 }} />
            {session ? (
              <div className="desktop-only"><LogoutButton /></div>
            ) : (
              <nav className="nav-links desktop-only" style={{ margin: 0 }}>
                <a href="/register">حساب جديد</a>
                <a href="/login">دخول</a>
              </nav>
            )}
            <MobileMenu isLoggedIn={!!session} isStudent={isStudent} studentId={studentId} isAdmin={!isStudent && !!session} role={session?.role ?? ""} />
          </div>
        </header>
        <main className="container-x" style={{ paddingTop: 24, paddingBottom: 12 }}>
          {session && !isStudent ? (
            <div className="admin-shell">
              <aside className="sidebar desktop-only">
                <div style={{ padding: "6px 12px 12px", borderBottom: "1px solid rgba(255,255,255,.12)", marginBottom: 8 }}>
                  <div style={{ fontWeight: 900, fontSize: 15 }}>لوحة التحكم</div>
                  <div style={{ fontSize: 12, color: "var(--gold-400)" }}>
                    {ROLE_LABEL_AR[session.role as keyof typeof ROLE_LABEL_AR] ?? session.role}
                  </div>
                </div>
                <AdminNav role={session.role} />
              </aside>
              <div className="admin-main">{children}</div>
            </div>
          ) : (
            children
          )}
        </main>
        <footer className="site-footer">
          <div className="bar">
            <span>منظومة اتحاد الطلاب — جامعة دمنهور الأهلية</span>
            <span>التسجيل · الفعاليات · التواصل</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
