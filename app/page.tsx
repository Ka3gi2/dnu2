import { createServiceClient } from "@/lib/supabase/server";
import LandingPage from "@/components/LandingPage";

export default async function HomePage() {
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
}
