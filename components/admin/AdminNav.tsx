"use client";
import { usePathname } from "next/navigation";
import { ADMIN_ROLES, COMMUNICATION_ROLES } from "@/lib/roles";

export default function AdminNav({ role }: { role: string }) {
  const path = usePathname();
  const isAdmin = ADMIN_ROLES.includes(role as never);
  const canComm = COMMUNICATION_ROLES.includes(role as never);

  const links: { href: string; label: string }[] = [];
  if (isAdmin) links.push({ href: "/admin", label: "نظرة عامة" });
  if (role !== "volunteer") links.push({ href: "/students", label: "الطلبة" });
  if (["super_admin", "president", "committee_head"].includes(role)) {
    links.push({ href: "/credentials", label: "بيانات الدخول" });
  }
  links.push({ href: "/events", label: "الفعاليات" });
  if (canComm) links.push({ href: "/communication", label: "التواصل" });
  if (isAdmin) {
    links.push({ href: "/admin/faculties", label: "الكليات والأقسام" });
    links.push({ href: "/admin/users", label: "المسؤولون" });
  }
  if (["super_admin", "president", "event_manager", "committee_head", "volunteer"].includes(role)) {
    links.push({ href: "/admin/scanner", label: "السكانر" });
    links.push({ href: "/admin/surveys", label: "الاستبيانات" });
  }
  links.push({ href: "/", label: "عرض الموقع" });

  return (
    <nav>
      <div className="side-title">القائمة</div>
      {links.map((l) => {
        const active =
          l.href === "/" ? path === "/" : path === l.href || path.startsWith(l.href + "/");
        return (
          <a key={l.href} href={l.href} className={active ? "active" : ""}>
            {l.label}
          </a>
        );
      })}
    </nav>
  );
}
