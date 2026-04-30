import { getDashboardRequestContext } from "@/lib/dashboard/request-context";
import {
  fetchSacramentHomeData,
  fetchUpcomingSacramentSummaries,
  type SacramentHomeData,
} from "@/lib/dashboard/home-data-fetchers";
import { createClient } from "@/lib/supabase/server";

import { DashboardHero } from "@/components/dashboard/home/dashboard-hero";
import { DashboardThisSunday } from "@/components/dashboard/home/dashboard-this-sunday";
import { DashboardProgramStatus } from "@/components/dashboard/home/dashboard-program-status";
import { DashboardQuickLinks } from "@/components/dashboard/home/dashboard-quick-links";
import { DashboardLookingAhead } from "@/components/dashboard/home/dashboard-looking-ahead";
import { DashboardAnnouncementsPreview } from "@/components/dashboard/home/dashboard-announcements-preview";

// ── Status message derivation ──────────────────────────────────────────────

type ProgramSeverity = "needs-assignment" | "needs-confirmation" | "set" | "n-a";

function deriveProgramSeverity(data: SacramentHomeData): ProgramSeverity {
  if (!data.programApplicable) return "n-a";
  const slots: { unassigned: boolean; pending: boolean }[] = [
    { unassigned: data.conducting.status === "unassigned", pending: false },
    { unassigned: data.presiding.status === "unassigned", pending: false },
    ...data.speakers.map((p) => ({
      unassigned: p.status === "missing",
      pending: p.status === "pending",
    })),
    ...data.prayers.map((p) => ({
      unassigned: p.status === "missing",
      pending: p.status === "pending",
    })),
    ...data.hymns.map((h) => ({
      unassigned: h.status === "unchosen",
      pending: false,
    })),
  ];
  if (slots.some((s) => s.unassigned)) return "needs-assignment";
  if (slots.some((s) => s.pending)) return "needs-confirmation";
  return "set";
}

function formatList(items: string[]) {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function capitalize(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function gapPhrase(data: SacramentHomeData): string {
  const speakersUnassigned = data.speakers.filter((p) => p.status === "missing").length;
  const prayersUnassigned = data.prayers.filter((p) => p.status === "missing").length;
  const hymnsUnchosen = data.hymns.filter((h) => h.status === "unchosen").length;
  const conductingUnassigned = data.conducting.status === "unassigned";
  const presidingUnassigned = data.presiding.status === "unassigned";

  const parts: string[] = [];
  if (speakersUnassigned > 0)
    parts.push(`${speakersUnassigned} ${speakersUnassigned === 1 ? "speaker" : "speakers"}`);
  if (prayersUnassigned > 0)
    parts.push(`${prayersUnassigned} ${prayersUnassigned === 1 ? "prayer" : "prayers"}`);
  if (hymnsUnchosen > 0)
    parts.push(`${hymnsUnchosen} ${hymnsUnchosen === 1 ? "hymn" : "hymns"}`);
  if (conductingUnassigned) parts.push("conducting");
  if (presidingUnassigned) parts.push("presiding");
  if (parts.length === 0) return "Some assignments are still open";

  const onlyHymns = hymnsUnchosen > 0 && parts.length === 1;
  const verb = onlyHymns ? "to choose" : "to assign";
  return `${capitalize(formatList(parts))} ${verb}`;
}

function statusSubhead(data: SacramentHomeData): string {
  const severity = deriveProgramSeverity(data);
  if (severity === "needs-assignment") return `${gapPhrase(data)}.`;
  if (severity === "needs-confirmation") {
    const pending =
      data.speakers.filter((p) => p.status === "pending").length +
      data.prayers.filter((p) => p.status === "pending").length;
    if (pending === 0) return "Awaiting confirmations.";
    return `Awaiting ${pending} ${pending === 1 ? "confirmation" : "confirmations"}.`;
  }
  if (severity === "n-a") return "No program assignments needed this Sunday.";
  return "Sunday is set. You're ready for this week's meeting.";
}

// ── Page ───────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const [{ profile }, supabase] = await Promise.all([
    getDashboardRequestContext(),
    createClient(),
  ]);

  const data = await fetchSacramentHomeData(supabase, profile.workspace_id);
  const upcoming = await fetchUpcomingSacramentSummaries(
    supabase,
    profile.workspace_id,
    data.meetingDate,
    3
  );

  const role = (profile as { role?: string | null }).role?.toLowerCase() ?? "";
  const firstName = profile.full_name?.split(" ")[0] ?? "Bishop";
  const displayName = role.includes("bishop") ? "Bishop" : firstName;
  const statusMessage = statusSubhead(data);

  return (
    <div className="h-full w-full overflow-y-auto bg-surface-canvas text-foreground">
      <main className="mx-auto flex w-full max-w-[1000px] flex-col gap-6 px-4 py-8 sm:gap-8 sm:px-8 sm:py-12 lg:py-16">
        {/* Hero greeting */}
        <DashboardHero displayName={displayName} statusMessage={statusMessage} />

        {/* This Sunday - Hero card */}
        <DashboardThisSunday data={data} />

        {/* Program status grid */}
        <DashboardProgramStatus data={data} />

        {/* Quick links navigation */}
        <DashboardQuickLinks />

        {/* Two-column layout for Looking ahead + Announcements */}
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
          <DashboardLookingAhead rows={upcoming} />
          <DashboardAnnouncementsPreview
            announcements={data.announcements}
            count={data.announcementCount}
          />
        </div>
      </main>
    </div>
  );
}
