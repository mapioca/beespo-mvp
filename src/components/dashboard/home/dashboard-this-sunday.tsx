import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Clock, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SacramentHomeData } from "@/lib/dashboard/home-data-fetchers";

// ── Typography tokens ──────────────────────────────────────────────────────

const T_META =
  "text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground";
const T_LEAD = "text-[20px] font-medium leading-[1.2] sm:text-[22px]";

// ── Card primitives ────────────────────────────────────────────────────────

const CARD_HERO = cn(
  "relative overflow-hidden rounded-[20px] border border-border/70",
  "bg-gradient-to-b from-surface-raised to-surface-raised/95",
  "shadow-[var(--shadow-builder-card-hover)]"
);
const CARD_PAD_HERO = "px-6 py-7 sm:px-8 sm:py-8";

// ── Helpers ────────────────────────────────────────────────────────────────

function formatLongDate(isoDate: string) {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function daysUntil(isoDate: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${isoDate}T12:00:00`);
  target.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((target.getTime() - today.getTime()) / 86400000));
}

function relativeDayLabel(isoDate: string) {
  const days = daysUntil(isoDate);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}

type ReadinessStatus = "set" | "needs-attention" | "n-a";

function deriveReadinessStatus(data: SacramentHomeData): ReadinessStatus {
  if (!data.programApplicable) return "n-a";
  
  const hasUnassigned =
    data.conducting.status === "unassigned" ||
    data.presiding.status === "unassigned" ||
    data.speakers.some((p) => p.status === "missing") ||
    data.prayers.some((p) => p.status === "missing") ||
    data.hymns.some((h) => h.status === "unchosen");
  
  const hasPending =
    data.speakers.some((p) => p.status === "pending") ||
    data.prayers.some((p) => p.status === "pending");
  
  if (hasUnassigned || hasPending) return "needs-attention";
  return "set";
}

function getProgressStats(data: SacramentHomeData) {
  if (!data.programApplicable) return null;
  
  const totalSlots =
    data.speakers.length +
    data.prayers.length +
    data.hymns.length +
    2; // conducting + presiding
  
  const filledSlots =
    data.speakers.filter((p) => p.status !== "missing").length +
    data.prayers.filter((p) => p.status !== "missing").length +
    data.hymns.filter((h) => h.status === "chosen").length +
    (data.conducting.status === "assigned" ? 1 : 0) +
    (data.presiding.status === "assigned" ? 1 : 0);
  
  const confirmedSlots =
    data.speakers.filter((p) => p.status === "confirmed").length +
    data.prayers.filter((p) => p.status === "confirmed").length;
  
  return {
    total: totalSlots,
    filled: filledSlots,
    confirmed: confirmedSlots,
    percent: Math.round((filledSlots / totalSlots) * 100),
  };
}

// ── Component ──────────────────────────────────────────────────────────────

interface DashboardThisSundayProps {
  data: SacramentHomeData;
}

export function DashboardThisSunday({ data }: DashboardThisSundayProps) {
  const dayLabel = relativeDayLabel(data.meetingDate);
  const readiness = deriveReadinessStatus(data);
  const stats = getProgressStats(data);
  
  const statusConfig = {
    set: {
      icon: CheckCircle2,
      label: "All set",
      color: "text-emerald-500 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    "needs-attention": {
      icon: AlertCircle,
      label: "Needs attention",
      color: "text-[hsl(var(--cp-warning))]",
      bg: "bg-[hsl(var(--cp-warning))]/10",
    },
    "n-a": {
      icon: Clock,
      label: "No program needed",
      color: "text-muted-foreground",
      bg: "bg-muted/50",
    },
  };
  
  const config = statusConfig[readiness];
  const StatusIcon = config.icon;

  return (
    <section className={cn(CARD_HERO, CARD_PAD_HERO)}>
      {/* Gradient accent line */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/40 to-transparent"
        aria-hidden
      />
      
      {/* Secondary gradient for depth */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background/5 to-transparent"
        aria-hidden
      />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
        {/* Main info */}
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className={T_META}>This Sunday</span>
            <span className="h-px flex-1 bg-border/50" />
            <span className={cn(T_META, "text-foreground/60")}>{dayLabel}</span>
          </div>
          
          <h2 className={cn(T_LEAD, "text-foreground")}>
            {formatLongDate(data.meetingDate)}
          </h2>
          
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground">
            <span>{data.meetingType}</span>
            <span className="text-border">|</span>
            <span>{data.meetingTime}</span>
          </div>
        </div>

        {/* Status + CTA */}
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center lg:flex-col lg:items-end">
          {/* Status badge */}
          <div
            className={cn(
              "flex items-center gap-2 rounded-full px-3 py-1.5",
              config.bg
            )}
          >
            <StatusIcon className={cn("h-4 w-4", config.color)} />
            <span className={cn("text-[12px] font-medium", config.color)}>
              {config.label}
            </span>
            {stats && readiness !== "n-a" && (
              <span className="text-[11px] text-muted-foreground">
                {stats.filled}/{stats.total}
              </span>
            )}
          </div>

          {/* Primary CTA */}
          <Button asChild size="default" className="w-full sm:w-auto">
            <Link href={data.plannerHref}>
              Open agenda
              <ArrowUpRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      {stats && readiness !== "n-a" && (
        <div className="relative mt-6 pt-5 before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-border/50">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Program completion</span>
            <span className="font-medium text-foreground">{stats.percent}%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted/60">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                readiness === "set"
                  ? "bg-emerald-500"
                  : "bg-brand"
              )}
              style={{ width: `${stats.percent}%` }}
            />
          </div>
        </div>
      )}
    </section>
  );
}
