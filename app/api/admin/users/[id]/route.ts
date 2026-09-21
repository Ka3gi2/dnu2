import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { hashPassword, requireSession, validatePassword } from "@/lib/auth";
import { ROLES } from "@/lib/roles";

function denied(e: unknown) {
  const status = (e as { status?: number })?.status ?? 500;
  const error = e instanceof Error ? e.message : "خطأ غير متوقع.";
  return NextResponse.json({ error }, { status });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(["super_admin", "president"]);
    const { id } = await params;
    const body = await req.json();
    const db = createServiceClient();

    const patch: { role?: string; is_active?: boolean; password_hash?: string } = {};

    if (body.role !== undefined) {
      if (!ROLES.includes(body.role as never)) {
        return NextResponse.json({ error: "دور غير صحيح." }, { status: 400 });
      }
      if (id === session.uid) {
        return NextResponse.json({ error: "لا تغيّر دور حسابك بنفسك." }, { status: 403 });
      }
      // keep at least one active super_admin
      if (body.role !== "super_admin") {
        const { data: target } = await db.from("users").select("role").eq("id", id).single();
        if (target?.role === "super_admin") {
          const { count } = await db
            .from("users")
            .select("id", { count: "exact", head: true })
            .eq("role", "super_admin")
            .eq("is_active", true)
            .neq("id", id);
          if ((count ?? 0) === 0) {
            return NextResponse.json({ error: "لازم يفضل مدير عام واحد نشط على الأقل." }, { status: 409 });
          }
        }
      }
      patch.role = body.role;
    }

    if (body.is_active !== undefined) {
      if (id === session.uid) {
        return NextResponse.json({ error: "لا تعطّل حسابك بنفسك." }, { status: 403 });
      }
      patch.is_active = Boolean(body.is_active);
    }

    if (body.password !== undefined && String(body.password).length > 0) {
      validatePassword(String(body.password));
      patch.password_hash = await hashPassword(String(body.password));
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "لا يوجد ما يُحدّث." }, { status: 400 });
    }

    const { data, error } = await db
      .from("users")
      .update(patch)
      .eq("id", id)
      .select("id,phone,role,is_active")
      .single();
    if (error) throw error;
    return NextResponse.json({ user: data });
  } catch (e) {
    return denied(e);
  }
}
