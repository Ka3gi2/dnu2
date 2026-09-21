import type { ReactNode } from "react";

export function PageHeader({
  title,
  sub,
  actions,
}: {
  title: string;
  sub?: string;
  actions?: ReactNode;
}) {
  return (
    <div
      className="reveal"
      style={{ display: "flex", gap: 12, alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", marginBottom: 6 }}
    >
      <div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>{title}</h1>
        {sub && <p className="section-sub" style={{ margin: "4px 0 0" }}>{sub}</p>}
      </div>
      {actions && <div style={{ display: "flex", gap: 8 }}>{actions}</div>}
    </div>
  );
}

export function Stat({
  value,
  label,
  delay = "",
}: {
  value: ReactNode;
  label: string;
  delay?: string;
}) {
  return (
    <div className={`card stat-card reveal ${delay}`}>
      <div className="value">{value}</div>
      <div className="label">{label}</div>
    </div>
  );
}

export function Empty({ text }: { text: string }) {
  return <div className="empty reveal">{text}</div>;
}
