import { readSession } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

// Admin pages already live inside the global staff sidebar (root layout).
// This only adds a small identity bar on top.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await readSession();
  let phone = "";
  if (session) {
    const svc = createServiceClient();
    const { data } = await svc.from("users").select("phone").eq("id", session.uid).single();
    phone = data?.phone ?? "";
  }
  return (
    <>
      <div className="admin-topbar">
        <strong>إدارة النظام</strong>
        {phone && <span className="pill qr-ltr">{phone}</span>}
      </div>
      {children}
    </>
  );
}
