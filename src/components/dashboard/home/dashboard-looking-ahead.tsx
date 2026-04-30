import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import type { UpcomingSacramentSummary } from "@/lib/dashboard/home-data-fetchers";

// ── Card primitives ────────────────────────────────────────────────────────

const CARD_BASE =
  "rounded-2xl border border-border/70 bg-surface-raised shadow-[var(--shadow-builder-card)]";
const CARD_PAD = "px-5 py-5 sm:px-6 sm:py-6";

// ── Helpers ────────────────────────────────────────────────────────────────

function formatShortDate(isoDate: string) {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
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

function upcomingPhrase(summary: UpcomingSacramentSummary): string {
  if (!summary.isProgramApplicable) return "No program needed";
  if (!summary.hasAnyData) return "Not started";

  const speakersGap = summary.speakersTotal - summary.speakersAssigned;
  const prayersGap = summary.prayersTotal - summary.prayersAssigned;
  const hymnsGap = summary.hymnsTotal - summary.hymnsChosen;

  if (speakersGap === 0 && prayersGap === 0 && hymnsGap === 0) {
    if (summary.speakersTotal === 0 && summary.prayersTotal === 0 && summary.hymnsTotal === 0) {
      return "Not started";
    }
    return "All set";
  }

  const parts: string[] = [];
  if (speakersGap > 0) parts.push(`${speakersGap} ${speakersGap === 1 ? "speaker" : "speakers"}`);
  if (prayersGap > 0) parts.push(`${prayersGap} ${prayersGap === 1 ? "prayer" : "prayers"}`);
  if (hymnsGap > 0) parts.push(`${hymnsGap} ${hymnsGap === 1 ? "hymn" : "hymns"}`);

  const onlyHymns = hymnsGap > 0 && parts.length === 1;
  const verb = onlyHymns ? "to choose" : "to assign";
  return `${capitalize(formatList(parts))} ${verb}`;
}

type RowStatus = "set" | "partial" | "empty" | "n-a";

function deriveRowStatus(summary: UpcomingSacramentSummary): RowStatus {
  const phrase = upcomingPhrase(summary);
  if (phrase === "All set") return "set";
  if (phrase === "Not started" || phrase === "No program needed") return "empty";
  return "partial";
}

// ── Timeline row component ─────────────────────────────────────────────────

interface TimelineRowProps {
  summary: UpcomingSacramentSummary;
  isLast: boolean;
}

function TimelineRow({ summary, isLast }: TimelineRowProps) {
  const phrase = upcomingPhrase(summary);
  const status = deriveRowStatus(summary);

  const statusConfig = {
    set: {
      dot: "bg-emerald-500 ring-emerald-500/20",
      text: "text-emerald-600 dark:text-emerald-500",
    },
    partial: {
      dot: "bg-[hsl(var(--cp-warning))] ring-[hsl(var(--cp-warning))]/20",
      text: "text-foreground/90",
    },
    empty: {
      dot: "bg-muted-foreground/30 ring-muted-foreground/10",
      text: "text-muted-foreground/60",
    },
    "n-a": {
      dot: "bg-muted-foreground/20 ring-muted-foreground/5",
      text: "text-muted-foreground/60",
    },
  };

  const config = statusConfig[status];

  return (
    <Link
      href={summary.plannerHref}
      className={cn(
        "group relative flex items-center gap-4 rounded-xl py-3 pl-3 pr-2 transition-all duration-150",
        "hover:bg-muted/30",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      )}
    >
      {/* Timeline connector */}
      <div className="relative flex flex-col items-center">
        <div className={cn("h-3 w-3 rounded-full ring-4", config.dot)} />
        {!isLast && (
          <div className="absolute top-4 h-[calc(100%+12px)] w-px bg-border/60" />
        )}
      </div>

      {/* Date */}
      <div className="w-[70px] shrink-0 text-[14px] font-medium text-foreground sm:w-[80px]">
        {formatShortDate(summary.meetingDate)}
      </div>

      {/* Meeting type */}
      <div className="hidden min-w-0 flex-1 text-[13px] text-muted-foreground sm:block">
        {summary.meetingType}
      </div>

      {/* Status phrase */}
      <div className={cn("flex-1 text-[13px] sm:flex-none sm:text-right", config.text)}>
        {phrase}
      </div>

      {/* Arrow */}
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
    </Link>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

interface DashboardLookingAheadProps {
  rows: UpcomingSacramentSummary[];
}

export function DashboardLookingAhead({ rows }: DashboardLookingAheadProps) {
  if (rows.length === 0) return null;

  return (
    <section className={cn(CARD_BASE, CARD_PAD)}>
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground">
          Looking ahead
        </h3>
        <span className="text-[12px] text-muted-foreground">
          Next {rows.length} Sundays
        </span>
      </div>

      <div className="flex flex-col">
        {rows.map((row, index) => (
          <TimelineRow
            key={row.meetingDate}
            summary={row}
            isLast={index === rows.length - 1}
          />
        ))}
      </div>
    </section>
  );
}
