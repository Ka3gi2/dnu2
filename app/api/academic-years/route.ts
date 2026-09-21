import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const faculty_id = searchParams.get("faculty_id");
  if (!faculty_id) return NextResponse.json({ years: [] });
  const db = createServiceClient();
  const { data, error } = await db
    .from("academic_years")
    .select("id,name")
    .eq("faculty_id", faculty_id)
    .eq("is_active", true)
    .order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ years: data });
}
