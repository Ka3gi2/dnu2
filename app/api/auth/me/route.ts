import { NextResponse } from "next/server";
import { readSessionFresh } from "@/lib/auth";

export async function GET() {
  const s = await readSessionFresh();
  if (!s) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ user: s });
}
