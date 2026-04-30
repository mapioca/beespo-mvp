import Link from "next/link";
import { ChevronRight, Megaphone } from "lucide-react";

import { cn } from "@/lib/utils";
import type { HomeReadinessItem } from "@/lib/dashboard/home-data-fetchers";

// ── Card primitives ────────────────────────────────────────────────────────

const CARD_BASE =
  "rounded-2xl border border-border/70 bg-surface-raised shadow-[var(--shadow-builder-card)]";
const CARD_PAD = "px-5 py-5 sm:px-6 sm:py-6";

// ── Announcement row component ─────────────────────────────────────────────

interface AnnouncementRowProps {
  item: HomeReadinessItem;
  href: string;
}

function AnnouncementRow({ item, href }: AnnouncementRowProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-3 rounded-xl py-3 pl-3 pr-2 transition-all duration-150",
        "hover:bg-muted/30",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      )}
    >
      <span
        className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand/60"
        aria-hidden
      />
      <span className="min-w-0 flex-1 text-[14px] leading-snug text-foreground">
        {item.title}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
    </Link>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

interface DashboardAnnouncementsPreviewProps {
  announcements: HomeReadinessItem[];
  count: number;
}

export function DashboardAnnouncementsPreview({
  announcements,
  count,
}: DashboardAnnouncementsPreviewProps) {
  const href = "/meetings/sacrament/announcements";
  const displayItems = announcements.slice(0, 3);

  return (
    <section className={cn(CARD_BASE, CARD_PAD)}>
      <div className="mb-4 flex items-baseline justify-between">
        <Link
          href={href}
          className="group inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
        >
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground">
            Announcements
          </h3>
          <ChevronRight className="h-3 w-3 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5" />
        </Link>
        <span className="text-[12px] text-muted-foreground">
          {count} active
        </span>
      </div>

      {displayItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/60">
            <Megaphone className="h-5 w-5 text-muted-foreground/60" />
          </div>
          <p className="text-[13px] text-muted-foreground">
            No active announcements for this Sunday.
          </p>
        </div>
      ) : (
        <div className="flex flex-col">
          {displayItems.map((item) => (
            <AnnouncementRow key={item.id} item={item} href={href} />
          ))}
          {count > 3 && (
            <Link
              href={href}
              className="mt-2 inline-flex items-center gap-1 self-start rounded-md px-3 py-1.5 text-[12px] font-medium text-brand transition-colors hover:bg-brand/10"
            >
              View all {count} announcements
              <ChevronRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
