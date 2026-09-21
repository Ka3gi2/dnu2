"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface EventRow {
  id: string;
  title: string;
  location: string | null;
  starts_at: string;
}

const FACES = [
  { src: "/faces/1.jpg", size: "large" },
  { src: "/faces/2.jpg", size: "small" },
  { src: "/faces/3.jpg", size: "small" },
  { src: "/faces/4.jpg", size: "small" },
  { src: "/faces/5.jpg", size: "small" },
];

const GALLERY_ITEMS = [
  { title: "النشاط الرياضي", count: "+350 طالب", image: "/events/sports-new.jpg" },
  { title: "الليلة الثقافية 2026", count: "+200 طالب", image: "/events/cultural-night.jpg" },
  { title: "يوم التطوع", count: "+60 طالب", image: "/events/volunteer-day.jpg" },
  { title: "مسابقة البرمجة", count: "+80 طالب", image: "/events/coding-contest.jpg" },
  { title: "ورشة العمل", count: "+60 طالب", image: "/events/workshop.jpg" },
  { title: "بطولة الشطرنج", count: "+45 طالب", image: "/events/chess-day.jpg" },
];

const YEARS = ["2026"];
const CATEGORIES = ["الرياضة", "الثقافة", "الفن", "التطوع", "المسابقات"];

const YEAR_EVENTS: Record<string, { title: string; category: string; image?: string }[]> = {
  "2026": [
    { title: "النشاط الرياضي", category: "الرياضة", image: "/events/sports-new.jpg" },
    { title: "الليلة الثقافية", category: "الثقافة", image: "/events/cultural-night.jpg" },
    { title: "يوم التطوع", category: "التطوع", image: "/events/volunteer-day.jpg" },
    { title: "مسابقة البرمجة", category: "المسابقات", image: "/events/coding-contest.jpg" },
  ],
  "2025": [
    { title: "ورشة العمل", category: "الفن", image: "/events/workshop.jpg" },
    { title: "بطولة الشطرنج", category: "المسابقات", image: "/events/chess-day.jpg" },
    { title: "يوم رياضي", category: "الرياضة", image: "/events/sports-activity.jpg" },
    { title: "حفل التخريج", category: "الثقافة" },
  ],
};

const IMPACT_NUMBERS = [
  { target: 300, label: "طالب شارك", suffix: "" },
  { target: 47, label: "فعالية", suffix: "" },
  { target: 12, label: "نشاط", suffix: "" },
  { target: 365, label: "يوم من الذكريات", suffix: "" },
];

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, visible };
}

function AnimatedCounter({ target, suffix }: { target: number; suffix: string }) {
  const { ref, visible } = useInView(0.3);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const duration = 2000;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [visible, target]);

  return (
    <div ref={ref} className="impact-num">
      <span className="impact-value">{count.toLocaleString()}{suffix}</span>
      <span className="impact-label">{target === 300 ? "طالب شارك" : target === 47 ? "فعالية" : target === 12 ? "نشاط" : "يوم من الذكريات"}</span>
    </div>
  );
}

function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, visible } = useInView(0.12);
  return (
    <div
      ref={ref}
      className={visible ? "lp-fade-in lp-fade-visible" : "lp-fade-in"}
      style={{ transitionDelay: `${delay}s` }}
    >
      {children}
    </div>
  );
}

export default function LandingPage({ upcomingEvents }: { upcomingEvents: EventRow[] }) {
  const [activeYear, setActiveYear] = useState("2026");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filteredEvents = YEAR_EVENTS[activeYear]?.filter(
    (e) => !activeCategory || e.category === activeCategory
  ) ?? [];

  return (
    <div className="lp-root">
      <section className="lp-hero">
        <div className="lp-hero-content">
          <FadeIn>
            <h1 className="lp-hero-title">WE ARE THE UNION</h1>
          </FadeIn>
          <FadeIn delay={0.15}>
            <p className="lp-hero-sub">طلاب يصنعون التجربة... لطلاب مثلهم.</p>
          </FadeIn>
        </div>
        <FadeIn delay={0.3}>
          <div className="lp-faces">
            {FACES.map((f, i) => (
              <div key={i} className={`lp-face lp-face-${f.size}`}>
                <img src={f.src} alt="" />
              </div>
            ))}
          </div>
        </FadeIn>
      </section>

      <section className="lp-transition">
        <FadeIn>
          <p className="lp-transition-text">Behind every event, there are people.</p>
        </FadeIn>
        <FadeIn delay={0.2}>
          <a href="/students" className="lp-transition-link">Meet the Union Team &larr;</a>
        </FadeIn>
      </section>

      <section className="lp-gallery-section">
        <h2 className="lp-section-heading lp-fade-in lp-fade-visible">WE&apos;VE BEEN HERE.</h2>
        <div className="lp-gallery">
          {GALLERY_ITEMS.map((item, i) => (
            <div key={i} className="lp-gallery-item lp-fade-in lp-fade-visible">
              <img src={item.image} alt={item.title} className="lp-gallery-img" loading="lazy" />
              <div className="lp-gallery-overlay">
                <span className="lp-gallery-title">{item.title}</span>
                <span className="lp-gallery-count">{item.count}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-archive">
        <h2 className="lp-section-heading lp-fade-in lp-fade-visible">Moments we made.</h2>
        <div className="lp-year-tabs lp-fade-in lp-fade-visible">
          {YEARS.map((y) => (
            <button
              key={y}
              className={`lp-year-tab ${activeYear === y ? "lp-year-active" : ""}`}
              onClick={() => { setActiveYear(y); setActiveCategory(null); }}
            >
              {y}
            </button>
          ))}
        </div>
        <div className="lp-categories lp-fade-in lp-fade-visible">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              className={`lp-category-pill ${activeCategory === c ? "lp-cat-active" : ""}`}
              onClick={() => setActiveCategory(activeCategory === c ? null : c)}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="lp-archive-grid">
          {filteredEvents.map((ev, i) => (
            <div key={`${activeYear}-${i}`} className="lp-archive-card lp-fade-in lp-fade-visible" style={{ background: ev.image ? undefined : "var(--navy-100)" }}>
              {ev.image && <img src={ev.image} alt={ev.title} className="lp-archive-img" loading="lazy" />}
              <div className="lp-archive-overlay">
                <span className="lp-archive-title">{ev.title}</span>
                <span className="lp-archive-cat">{ev.category}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-impact">
        <div className="lp-impact-bg" />
        <div className="lp-impact-inner">
          {IMPACT_NUMBERS.map((n, i) => (
            <AnimatedCounter key={i} target={n.target} suffix={n.suffix} />
          ))}
        </div>
      </section>

      <section className="lp-story">
        <div className="lp-story-inner">
          <div className="lp-story-photo lp-fade-in lp-fade-visible">
            <img src="/story/featured.jpg" alt="ذكرى بطولة كرة القدم" style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }} loading="lazy" />
          </div>
          <div className="lp-story-text">
            <h2 className="lp-story-title lp-fade-in lp-fade-visible">Started as a tournament. Became a memory.</h2>
            <p className="lp-story-desc lp-fade-in lp-fade-visible">
              فريق كرة القدم بدأ كبطولة بسيطة بين الأقسام، وبقى أحد من أقوى الذكريات في تاريخ الاتحاد.
            </p>
            <a href="/events" className="btn btn-navy lp-fade-in lp-fade-visible">Explore the story &larr;</a>
          </div>
        </div>
      </section>

      <section className="lp-upcoming">
        <h2 className="lp-section-heading lp-fade-in lp-fade-visible" style={{ textAlign: "center" }}>Yesterday was a memory. Tomorrow is waiting.</h2>
        <p className="lp-upcoming-sub lp-fade-in lp-fade-visible">What&apos;s next?</p>
        <div className="lp-upcoming-grid">
          {upcomingEvents.length > 0 ? upcomingEvents.slice(0, 3).map((ev, i) => (
            <div key={ev.id} className="lp-upcoming-card lp-fade-in lp-fade-visible">
              <div className="lp-upcoming-date">
                <span className="lp-upcoming-day">{new Date(ev.starts_at).getDate()}</span>
                <span className="lp-upcoming-month">{new Date(ev.starts_at).toLocaleDateString("ar", { month: "short" })}</span>
              </div>
              <div className="lp-upcoming-info">
                <h3>{ev.title}</h3>
                <p>{ev.location ?? "قريباً"}</p>
              </div>
            </div>
          )) : (
            <p className="lp-empty-events lp-fade-in lp-fade-visible">لا فعاليات قادمة حالياً</p>
          )}
        </div>
        <div className="lp-cta lp-fade-in lp-fade-visible">
          <a href="/register" className="btn btn-gold">سجّل الآن</a>
        </div>
      </section>
    </div>
  );
}
