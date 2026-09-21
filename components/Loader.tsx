"use client";
import { useState, useEffect } from "react";

export default function Loader() {
  const [mounted, setMounted] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    setMounted(true);
    const t1 = setTimeout(() => setFading(true), 1200);
    const t2 = setTimeout(() => setMounted(false), 1700);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (!mounted) return null;

  return (
    <div className={`loader-overlay ${fading ? "fade-out" : ""}`}>
      <div className="loader-content">
        <div className="loader-logo">
          <img src="/logo.webp" alt="جامعة دمنهور" width={120} height={120} />
        </div>
        <div className="loader-spinner" />
        <div className="loader-text">
          <strong>اتحاد الطلاب</strong>
          <span>جامعة دمنهور الأهلية</span>
        </div>
      </div>
    </div>
  );
}
