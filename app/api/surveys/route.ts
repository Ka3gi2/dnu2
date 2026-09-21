import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";

export async function GET() {
  try {
    await requireSession();
    const db = createServiceClient();
    const { data, error } = await db
      .from("surveys")
      .select("id,title,description,status,created_at,events(title)")
      .eq("status", "open")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ surveys: data });
  } catch (e: unknown) {
    const status = (e as { status?: number })?.status ?? 500;
    return NextResponse.json({ error: e instanceof Error ? e.message : "خطأ." }, { status });
  }
}
