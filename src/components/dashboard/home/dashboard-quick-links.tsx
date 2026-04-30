import Link from "next/link";
import {
  Calendar,
  Users,
  Briefcase,
  Megaphone,
  Archive,
  ChevronRight,
} from "lucide-react";

import { cn } from "@/lib/utils";

// ── Card primitives ────────────────────────────────────────────────────────

const CARD_BASE =
  "rounded-2xl border border-border/70 bg-surface-raised shadow-[var(--shadow-builder-card)]";
const CARD_PAD = "px-5 py-5 sm:px-6 sm:py-6";

// ── Link data ──────────────────────────────────────────────────────────────

const QUICK_LINKS = [
  {
    href: "/meetings/sacrament/planner",
    icon: Calendar,
    label: "Planner",
    description: "Plan upcoming meetings",
  },
  {
    href: "/meetings/sacrament/speakers",
    icon: Users,
    label: "Speakers",
    description: "Manage speaker assignments",
  },
  {
    href: "/meetings/sacrament/business",
    icon: Briefcase,
    label: "Business",
    description: "Sustainings and releases",
  },
  {
    href: "/meetings/sacrament/announcements",
    icon: Megaphone,
    label: "Announcements",
    description: "Ward announcements",
  },
  {
    href: "/meetings/sacrament/archive",
    icon: Archive,
    label: "Archive",
    description: "Past meeting programs",
  },
];

// ── Component ──────────────────────────────────────────────────────────────

export function DashboardQuickLinks() {
  return (
    <section className={cn(CARD_BASE, CARD_PAD)}>
      <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground">
        Quick links
      </h3>
      
      <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-5">
        {QUICK_LINKS.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "group flex items-center gap-3 rounded-xl p-3 transition-all duration-150",
                "border border-transparent",
                "hover:border-border/70 hover:bg-muted/30",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              )}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground transition-colors group-hover:bg-brand/10 group-hover:text-brand">
                <Icon className="h-5 w-5" />
              </div>
              
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[13px] font-medium text-foreground">
                  {link.label}
                </span>
                <span className="hidden text-[11px] text-muted-foreground lg:block">
                  {link.description}
                </span>
              </div>
              
              <ChevronRight className="hidden h-4 w-4 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground sm:block" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
