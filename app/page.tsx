import { createServiceClient } from "@/lib/supabase/server";
import LandingPage from "@/components/LandingPage";

export default async function HomePage() {
  // Never crash the landing page on DB trouble — show it with no events instead.
  try {
    const svc = createServiceClient();
    const now = new Date().toISOString();
    const { data: upcomingEvents } = await svc
      .from("events")
      .select("id, title, location, starts_at")
      .eq("status", "published")
      .gte("starts_at", now)
      .order("starts_at", { ascending: true })
      .limit(3);

    return <LandingPage upcomingEvents={upcomingEvents ?? []} />;
  } catch (e) {
    console.error("homepage events failed:", e instanceof Error ? e.message : e);
    return <LandingPage upcomingEvents={[]} />;
  }
}
