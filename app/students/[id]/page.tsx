import { createServiceClient } from "@/lib/supabase/server";
import { readSession } from "@/lib/auth";
import ReactQrCode from "react-qr-code";

const INTERESTS_MAP: Record<string, { emoji: string; label: string; color: string }> = {
  sports: { emoji: "⚽", label: "رياضة", color: "#22c55e" },
  art: { emoji: "🎨", label: "فن", color: "#a855f7" },
  tech: { emoji: "💻", label: "تكنولوجيا", color: "#3b82f6" },
  science: { emoji: "🔬", label: "علوم", color: "#06b6d4" },
  media: { emoji: "🎤", label: "إعلام", color: "#f43f5e" },
  culture: { emoji: "📚", label: "ثقافة", color: "#f59e0b" },
  volunteer: { emoji: "🤝", label: "تطوع", color: "#10b981" },
  entrepreneurship: { emoji: "🚀", label: "ريادة أعمال", color: "#8b5cf6" },
};

const LEVEL_LABELS: Record<number, string> = { 1: "الأول", 2: "الثاني", 3: "الثالث", 4: "الرابع", 5: "الخامس" };

export default async function StudentProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await readSession();
  const svc = createServiceClient();

  if (session?.role === "student") {
    const { data: u } = await svc.from("users").select("student_id").eq("id", session.uid).single();
    if (!u || u.student_id !== id) return <p style={{ textAlign: "center", padding: 60 }}>غير مصرح — تقدر تشوف ملفك فقط.</p>;
  }

  const { data: s } = await svc.from("students").select("*").eq("id", id).single();
  if (!s) return <p style={{ textAlign: "center", padding: 60 }}>الطالب غير موجود.</p>;

  const [{ data: stats }, { data: badges }, { data: regs }, { data: committees }, { data: activities }] = await Promise.all([
    svc.from("student_stats").select("events_attended,volunteer_hours,activities_count").eq("student_id", id).single(),
    svc.from("student_badges").select("awarded_at,badges(code,name,icon)").eq("student_id", id),
    svc.from("event_registrations").select("created_at,events(title,starts_at,location)").eq("student_id", id).order("created_at", { ascending: false }),
    svc.from("committee_members").select("joined_at,committees(name)").eq("student_id", id),
    svc.from("activities").select("id,title,created_at").eq("student_id", id).order("created_at", { ascending: false }),
  ]);

  let facultyName = "—";
  let depName = "—";
  if (s.faculty_id) {
    const { data: f } = await svc.from("faculties").select("name").eq("id", s.faculty_id).single();
    if (f) facultyName = f.name;
  }
  if (s.department_id) {
    const { data: d } = await svc.from("departments").select("name").eq("id", s.department_id).single();
    if (d) depName = d.name;
  }

  const totalBadges = (badges ?? []).length;
  const totalEvents = (regs ?? []).length;
  const totalCommittees = (committees ?? []).length;

  return (
    <div className="sp-root">

      <section className="sp-hero">
        <div className="sp-hero-bg" />
        <div className="sp-hero-content">
          <div className="sp-hero-left">
            <div className="sp-avatar">
              {s.avatar_url ? <img src={s.avatar_url} alt="" /> : <span>{s.full_name.trim().charAt(0)}</span>}
            </div>
            <div className="sp-hero-info">
              <h1 className="sp-name">{s.full_name}</h1>
              <div className="sp-faculty">{facultyName} — {depName}</div>
              <div className="sp-meta-row">
                {s.level && <span className="sp-meta-pill">المستوى {LEVEL_LABELS[s.level] ?? s.level}</span>}
                {s.academic_year && <span className="sp-meta-pill">فرقة {s.academic_year}</span>}
                {s.enrollment_year && <span className="sp-meta-pill">الالتحاق {s.enrollment_year}</span>}
              </div>
              <div className="sp-code-row qr-ltr">
                <span className="sp-code">{s.student_code}</span>
                <span className={`sp-status-dot ${s.student_status === "graduated" ? "sp-graduated" : ""}`} />
                <span className="sp-status-text">{s.student_status === "graduated" ? "خريج" : "طالب حالي"}</span>
              </div>
            </div>
          </div>
          <div className="sp-hero-right">
            <div className="sp-qr-card">
              <ReactQrCode value={s.qr_token} size={110} />
              <span className="sp-qr-label qr-ltr">{s.student_code}</span>
            </div>
          </div>
        </div>
      </section>

      <div className="sp-stats">
        {[
          { value: totalEvents, label: "فعاليات", icon: "🎯", bg: "sp-stat-blue" },
          { value: stats?.volunteer_hours ?? 0, label: "ساعة تطوع", icon: "🤝", bg: "sp-stat-green" },
          { value: stats?.activities_count ?? 0, label: "نشاط", icon: "⚡", bg: "sp-stat-amber" },
          { value: totalBadges, label: "شارة", icon: "🏆", bg: "sp-stat-purple" },
          { value: totalCommittees, label: "لجنة", icon: "🏛️", bg: "sp-stat-teal" },
        ].map((st, i) => (
          <div key={i} className={`sp-stat-card ${st.bg} reveal reveal-${i + 1}`}>
            <div className="sp-stat-icon">{st.icon}</div>
            <div className="sp-stat-value">{st.value}</div>
            <div className="sp-stat-label">{st.label}</div>
          </div>
        ))}
      </div>

      {(s.interests ?? []).length > 0 && (
        <div className="sp-section reveal">
          <div className="sp-section-header">
            <span className="sp-section-icon">💡</span>
            <h2>الاهتمامات</h2>
          </div>
          <div className="sp-interests-grid">
            {s.interests.map((key: string) => {
              const info = INTERESTS_MAP[key] ?? { emoji: "📌", label: key, color: "#6b7280" };
              return (
                <div key={key} className="sp-interest-card" style={{ borderColor: info.color + "40" }}>
                  <span className="sp-interest-emoji">{info.emoji}</span>
                  <span className="sp-interest-label">{info.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {(badges ?? []).length > 0 && (
        <div className="sp-section reveal">
          <div className="sp-section-header">
            <span className="sp-section-icon">🏆</span>
            <h2>الشارات</h2>
          </div>
          <div className="sp-badges-grid">
            {badges!.map((b: { awarded_at: string; badges: { code: string; name: string; icon?: string } | { code: string; name: string; icon?: string }[] }, i: number) => {
              const badge = Array.isArray(b.badges) ? b.badges[0] : b.badges;
              return (
                <div key={i} className="sp-badge-card reveal reveal-1">
                  <div className="sp-badge-icon">{badge?.icon ?? "🏅"}</div>
                  <div className="sp-badge-name">{badge?.name}</div>
                  <div className="sp-badge-date">
                    {new Date(b.awarded_at).toLocaleDateString("ar-EG", { year: "numeric", month: "short" })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="sp-section reveal">
        <div className="sp-section-header">
          <span className="sp-section-icon">📖</span>
          <h2>My University Journey</h2>
        </div>

        <div className="sp-journey-grid">

          {(regs ?? []).length > 0 && (
            <div className="sp-journey-col">
              <h3 className="sp-journey-title">الفعاليات</h3>
              {regs!.map((r: { created_at: string; events: { title: string; starts_at: string; location: string | null }[] | null }, i: number) => {
                const ev = r.events?.[0];
                const d = ev?.starts_at ? new Date(ev.starts_at) : null;
                return (
                  <div key={i} className="sp-journey-item">
                    <div className="sp-journey-date-badge">
                      <span className="sp-jd-day">{d?.getDate() ?? "?"}</span>
                      <span className="sp-jd-month">{d ? d.toLocaleDateString("ar-EG", { month: "short" }) : ""}</span>
                    </div>
                    <div className="sp-journey-item-body">
                      <div className="sp-journey-item-title">{ev?.title ?? "فعالية"}</div>
                      {ev?.location && <div className="sp-journey-item-meta">{ev.location}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {(committees ?? []).length > 0 && (
            <div className="sp-journey-col">
              <h3 className="sp-journey-title">اللجان</h3>
              {committees!.map((c: { joined_at: string; committees: { name: string }[] | null }, i: number) => (
                <div key={i} className="sp-journey-item">
                  <div className="sp-journey-item-icon" style={{ background: "rgba(233,168,0,0.15)" }}>🏛️</div>
                  <div className="sp-journey-item-body">
                    <div className="sp-journey-item-title">{c.committees?.[0]?.name ?? "لجنة"}</div>
                    <div className="sp-journey-item-meta">
                      انضم {new Date(c.joined_at).toLocaleDateString("ar-EG", { year: "numeric", month: "short" })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {(activities ?? []).length > 0 && (
            <div className="sp-journey-col">
              <h3 className="sp-journey-title">الأنشطة</h3>
              {activities!.map((a: { id: string; title: string; created_at: string }, i: number) => {
                const d = new Date(a.created_at);
                return (
                  <div key={i} className="sp-journey-item">
                    <div className="sp-journey-date-badge">
                      <span className="sp-jd-day">{d.getDate()}</span>
                      <span className="sp-jd-month">{d.toLocaleDateString("ar-EG", { month: "short" })}</span>
                    </div>
                    <div className="sp-journey-item-body">
                      <div className="sp-journey-item-title">{a.title}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {totalEvents === 0 && totalCommittees === 0 && (activities ?? []).length === 0 && (
          <div className="sp-empty">
            <span style={{ fontSize: 40 }}>🚀</span>
            <p>لسه مفيش أنشطة — ابدأ بتسجيل حضور فعالية!</p>
          </div>
        )}
      </div>

    </div>
  );
}
