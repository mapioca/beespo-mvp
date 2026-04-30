import Link from "next/link";
import {
  Users,
  HandHeart,
  Music,
  Megaphone,
  Briefcase,
  UserCheck,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { SacramentHomeData } from "@/lib/dashboard/home-data-fetchers";

// ── Card primitives ────────────────────────────────────────────────────────

const CARD_BASE =
  "rounded-2xl border border-border/70 bg-surface-raised shadow-[var(--shadow-builder-card)]";
const CARD_PAD = "px-5 py-5 sm:px-6 sm:py-6";

// ── Status tile component ──────────────────────────────────────────────────

type TileStatus = "complete" | "partial" | "empty" | "n-a";

interface StatusTileProps {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count: number;
  total: number;
  status: TileStatus;
}

function StatusTile({ href, icon: Icon, label, count, total, status }: StatusTileProps) {
  const statusConfig = {
    complete: {
      dot: "bg-emerald-500",
      text: "text-emerald-600 dark:text-emerald-500",
    },
    partial: {
      dot: "bg-[hsl(var(--cp-warning))]",
      text: "text-[hsl(var(--cp-warning))]",
    },
    empty: {
      dot: "bg-muted-foreground/30",
      text: "text-muted-foreground",
    },
    "n-a": {
      dot: "bg-muted-foreground/20",
      text: "text-muted-foreground/60",
    },
  };

  const config = statusConfig[status];

  return (
    <Link
      href={href}
      className={cn(
        "group relative flex flex-col gap-3 rounded-xl p-4 transition-all duration-150",
        "border border-transparent",
        "hover:border-border/70 hover:bg-muted/30",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground transition-colors group-hover:bg-muted group-hover:text-foreground">
          <Icon className="h-4.5 w-4.5" />
        </div>
        <div className={cn("h-2 w-2 rounded-full", config.dot)} />
      </div>
      
      <div className="flex flex-col gap-0.5">
        <span className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span className={cn("text-[15px] font-semibold", config.text)}>
          {status === "n-a" ? (
            "N/A"
          ) : (
            <>
              {count}
              <span className="text-muted-foreground/60">/{total}</span>
            </>
          )}
        </span>
      </div>
    </Link>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

interface DashboardProgramStatusProps {
  data: SacramentHomeData;
}

export function DashboardProgramStatus({ data }: DashboardProgramStatusProps) {
  const plannerHref = data.plannerHref;
  const speakersHref = "/meetings/sacrament/speakers";
  const businessHref = "/meetings/sacrament/business";
  const announcementsHref = "/meetings/sacrament/announcements";

  // Calculate counts
  const speakersAssigned = data.speakers.filter((s) => s.status !== "missing").length;
  const speakersTotal = data.speakers.length;
  
  const prayersAssigned = data.prayers.filter((p) => p.status !== "missing").length;
  const prayersTotal = data.prayers.length;
  
  const hymnsChosen = data.hymns.filter((h) => h.status === "chosen").length;
  const hymnsTotal = data.hymns.length;
  
  const leadershipAssigned =
    (data.conducting.status === "assigned" ? 1 : 0) +
    (data.presiding.status === "assigned" ? 1 : 0);
  const leadershipTotal = 2;

  // Derive tile status
  function getTileStatus(count: number, total: number): TileStatus {
    if (!data.programApplicable) return "n-a";
    if (total === 0) return "n-a";
    if (count === total) return "complete";
    if (count > 0) return "partial";
    return "empty";
  }

  const tiles: StatusTileProps[] = [
    {
      href: speakersHref,
      icon: Users,
      label: "Speakers",
      count: speakersAssigned,
      total: speakersTotal,
      status: getTileStatus(speakersAssigned, speakersTotal),
    },
    {
      href: plannerHref,
      icon: HandHeart,
      label: "Prayers",
      count: prayersAssigned,
      total: prayersTotal,
      status: getTileStatus(prayersAssigned, prayersTotal),
    },
    {
      href: plannerHref,
      icon: Music,
      label: "Hymns",
      count: hymnsChosen,
      total: hymnsTotal,
      status: getTileStatus(hymnsChosen, hymnsTotal),
    },
    {
      href: plannerHref,
      icon: UserCheck,
      label: "Leadership",
      count: leadershipAssigned,
      total: leadershipTotal,
      status: getTileStatus(leadershipAssigned, leadershipTotal),
    },
    {
      href: businessHref,
      icon: Briefcase,
      label: "Business",
      count: data.businessCount,
      total: data.businessCount || 0,
      status: data.businessCount > 0 ? "complete" : "empty",
    },
    {
      href: announcementsHref,
      icon: Megaphone,
      label: "Announcements",
      count: data.announcementCount,
      total: data.announcementCount || 0,
      status: data.announcementCount > 0 ? "complete" : "empty",
    },
  ];

  return (
    <section className={cn(CARD_BASE, CARD_PAD)}>
      <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground">
        Program at a glance
      </h3>
      
      <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map((tile) => (
          <StatusTile key={tile.label} {...tile} />
        ))}
      </div>
    </section>
  );
}
