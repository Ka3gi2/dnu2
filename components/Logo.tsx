"use client";
import { useState } from "react";

// University logo at /logo.png (save the uploaded logo there).
// Falls back to a gold-ring monogram if the file is missing.
export default function Logo({ size = 52 }: { size?: number }) {
  const [missing, setMissing] = useState(false);
  if (missing) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: "#fff",
          border: "3px solid var(--gold-500)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 900,
          fontSize: size * 0.28,
          color: "var(--navy-800)",
          flexShrink: 0,
        }}
      >
        دمنهور
      </div>
    );
  }
  return (
    <img
      src="/logo.webp"
      alt="شعار جامعة دمنهور الأهلية"
      width={size}
      height={size}
      onError={() => setMissing(true)}
      style={{ borderRadius: "50%", background: "#fff", padding: 2, flexShrink: 0 }}
    />
  );
}
