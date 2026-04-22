import type { ElementType } from "react";
import { Clock, CalendarDays, LayoutTemplate, BookOpen, Zap, MessageSquare } from "lucide-react";
import { getDashboardRequestContext } from "@/lib/dashboard/request-context";
import { createClient } from "@/lib/supabase/server";
import { fetchHomePageData } from "@/lib/dashboard/home-data-fetchers";
import { HomeGreeting } from "./home-greeting";
import { HomeRecentsCarousel } from "@/components/dashboard/home/home-recents-carousel";
import { HomeDiscussionsCarousel } from "@/components/dashboard/home/home-discussions-carousel";
import { HomeWeekCalendar } from "@/components/dashboard/home/home-week-calendar";
import { HomeLearnSection } from "@/components/dashboard/home/home-learn-section";
import { HomeFeaturedTemplates } from "@/components/dashboard/home/home-featured-templates";
import { HomeQuickActions } from "@/components/dashboard/home/home-quick-actions";

function SectionHeader({
  icon: Icon,
  label,
}: {
  icon: ElementType;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5 mb-3">
      <Icon className="h-3.5 w-3.5 text-muted-foreground/60" strokeWidth={1.8} />
      <span className="text-[12px] font-medium text-muted-foreground/70 tracking-wide">
        {label}
      </span>
    </div>
  );
}

export default async function DashboardPage() {
  // getDashboardRequestContext uses React.cache — no double fetch vs the layout
  const [{ profile }, supabase] = await Promise.all([
    getDashboardRequestContext(),
    createClient(),
  ]);

  const firstName = profile.full_name?.split(" ")[0] ?? "there";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const workspaceName = (profile as any).workspaces?.name as string | undefined;

  // Single parallelised fetch — only home-specific data
  const { weekMeetings, featuredTemplates, discussions } = await fetchHomePageData(
    supabase,
    profile.workspace_id
  );

  return (
    <div className="h-full w-full overflow-y-auto bg-surface-canvas rounded-[var(--radius)] border border-border shadow-sm">
      <div className="mx-auto max-w-3xl px-6 pt-16 pb-24 flex flex-col gap-10">

        {/* ── Greeting ─────────────────────────────────────────────────── */}
        <HomeGreeting firstName={firstName} workspaceName={workspaceName} />

        {/* ── Quick Actions ─────────────────────────────────────────────── */}
        <section>
          <SectionHeader icon={Zap} label="Quick actions" />
          <HomeQuickActions />
        </section>

        {/* ── Recents ──────────────────────────────────────────────────── */}
        <section>
          <SectionHeader icon={Clock} label="Recently visited" />
          <HomeRecentsCarousel />
        </section>

        {/* ── This Week ────────────────────────────────────────────────── */}
        <section>
          <SectionHeader icon={CalendarDays} label="Upcoming events" />
          <HomeWeekCalendar meetings={weekMeetings} />
        </section>

        {/* ── Open Discussions ─────────────────────────────────────────── */}
        <section>
          <SectionHeader icon={MessageSquare} label="Open discussions" />
          <HomeDiscussionsCarousel discussions={discussions} />
        </section>

        {/* ── Featured Templates ───────────────────────────────────────── */}
        <section>
          <SectionHeader icon={LayoutTemplate} label="Featured templates" />
          <HomeFeaturedTemplates templates={featuredTemplates} />
        </section>

        {/* ── Learn ─────────────────────────────────────────────────────── */}
        <section>
          <SectionHeader icon={BookOpen} label="Learn" />
          <HomeLearnSection />
        </section>

      </div>
    </div>
  );
}
