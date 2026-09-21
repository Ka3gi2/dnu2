import { createServiceClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";

async function count(table: string) {
  const db = createServiceClient();
  const { count } = await db.from(table).select("id", { count: "exact", head: true });
  return count ?? 0;
}

export default async function AdminHub() {
  const [students, events, campaigns, users] = await Promise.all([
    count("students"),
    count("events"),
    count("campaigns"),
    count("users"),
  ]);

  return (
    <div>
      <PageHeader title="نظرة عامة" sub="أرقام المنظومة الآن — اضغط على أي بطاقة للإدارة." />
      <div className="grid-cards">
        <a className="card stat-card reveal reveal-1" href="/students">
          <div className="value">{students}</div>
          <div className="label">طالب مسجل</div>
        </a>
        <a className="card stat-card reveal reveal-2" href="/events">
          <div className="value">{events}</div>
          <div className="label">فعالية</div>
        </a>
        <a className="card stat-card reveal reveal-2" href="/communication">
          <div className="value">{campaigns}</div>
          <div className="label">حملة تواصل</div>
        </a>
        <a className="card stat-card reveal reveal-3" href="/admin/users">
          <div className="value">{users}</div>
          <div className="label">حساب مسؤول</div>
        </a>
      </div>

      <h2 className="section-title">إجراءات سريعة</h2>
      <div className="grid-cards">
        <a className="card reveal reveal-1" href="/admin/faculties">
          <h3>الكليات والأقسام</h3>
          <p>إضافة الكليات والتخصصات وتفعيلها أو تعطيلها.</p>
        </a>
        <a className="card reveal reveal-2" href="/admin/users">
          <h3>المسؤولون</h3>
          <p>إضافة مسؤولين بالأدوار المختلفة وإدارتهم.</p>
        </a>
        <a className="card reveal reveal-3" href="/communication">
          <h3>حملة واتساب جديدة</h3>
          <p>قالب + جمهور + إرسال مجاني لكل مستلم.</p>
        </a>
        <a className="card reveal reveal-4" href="/admin/scanner">
          <h3>مسح QR</h3>
          <p>تسجيل حضور الطلبة بالسكانر.</p>
        </a>
      </div>
    </div>
  );
}
