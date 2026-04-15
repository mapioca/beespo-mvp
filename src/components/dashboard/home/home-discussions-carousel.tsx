"use client";

import { useRef, useCallback, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HomeDiscussion, DiscussionStatus } from "@/lib/dashboard/home-data-fetchers";

// ── Status config ──────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  DiscussionStatus,
  { label: string; dot: string; text: string }
> = {
  new:               { label: "New",               dot: "bg-sky-400",    text: "text-sky-600 dark:text-sky-400"    },
  active:            { label: "Active",            dot: "bg-emerald-400", text: "text-emerald-600 dark:text-emerald-400" },
  decision_required: { label: "Decision needed",   dot: "bg-amber-400",  text: "text-amber-600 dark:text-amber-400"  },
  monitoring:        { label: "Monitoring",        dot: "bg-violet-400", text: "text-violet-600 dark:text-violet-400" },
  resolved:          { label: "Resolved",          dot: "bg-muted-foreground/40", text: "text-muted-foreground" },
  deferred:          { label: "Deferred",          dot: "bg-muted-foreground/40", text: "text-muted-foreground" },
};

function formatRelativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDueDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// ── Card ───────────────────────────────────────────────────────────────────

function DiscussionCard({ discussion }: { discussion: HomeDiscussion }) {
  const cfg = STATUS_CONFIG[discussion.status];
  const isDueSoon =
    discussion.due_date &&
    new Date(discussion.due_date).getTime() - Date.now() < 3 * 86400 * 1000 &&
    new Date(discussion.due_date).getTime() > Date.now();

  return (
    <Link
      href={`/meetings/agendas/discussions/${discussion.id}`}
      className={cn(
        // matches recents card sizing and shape
        "flex-shrink-0 w-[220px] flex flex-col gap-2.5 rounded-[10px]",
        "border border-[hsl(var(--cp-border))] bg-[hsl(var(--cp-surface-2))]",
        "px-3.5 py-3.5",
        "hover:border-[hsl(var(--cp-border)/0.8)] hover:shadow-sm hover:bg-[hsl(var(--cp-hover))]",
        "transition-all duration-150"
      )}
    >
      {/* Status pill */}
      <div className="flex items-center gap-1.5">
        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", cfg.dot)} />
        <span className={cn("text-[11px] font-medium", cfg.text)}>
          {cfg.label}
        </span>
      </div>

      {/* Title */}
      <p className="text-[13px] font-semibold text-foreground leading-snug line-clamp-2">
        {discussion.title}
      </p>

      {/* Description */}
      {discussion.description && (
        <p className="text-[12px] text-muted-foreground leading-relaxed line-clamp-2">
          {discussion.description}
        </p>
      )}

      {/* Footer: due date + updated */}
      <div className="mt-auto flex items-center justify-between gap-2">
        {discussion.due_date ? (
          <span
            className={cn(
              "text-[10px] font-medium",
              isDueSoon ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground/70"
            )}
          >
            Due {formatDueDate(discussion.due_date)}
          </span>
        ) : (
          <span className="text-[10px] text-muted-foreground/50">No due date</span>
        )}
        <span className="text-[10px] text-muted-foreground/50 shrink-0">
          {formatRelativeDate(discussion.updated_at)}
        </span>
      </div>
    </Link>
  );
}

// ── Carousel ───────────────────────────────────────────────────────────────

interface HomeDiscussionsCarouselProps {
  discussions: HomeDiscussion[];
}

export function HomeDiscussionsCarousel({ discussions }: HomeDiscussionsCarouselProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const updateEdges = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }, []);

  const scroll = useCallback(
    (dir: "left" | "right") => {
      const el = railRef.current;
      if (!el) return;
      el.scrollBy({ left: dir === "right" ? 240 : -240, behavior: "smooth" });
      setTimeout(updateEdges, 350);
    },
    [updateEdges]
  );

  if (discussions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
        <MessageSquare className="h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">No open discussions right now.</p>
        <Link
          href="/meetings/agendas/discussions"
          className="text-xs text-[hsl(var(--cp-primary))] hover:underline"
        >
          View all discussions →
        </Link>
      </div>
    );
  }

  return (
    <div className="relative group">
      {/* Left fade */}
      <div
        className={cn(
          "pointer-events-none absolute left-0 top-0 bottom-0 w-10 z-10",
          "bg-gradient-to-r from-background to-transparent",
          "transition-opacity duration-200",
          atStart ? "opacity-0" : "opacity-100"
        )}
      />
      <button
        aria-label="Scroll discussions left"
        onClick={() => scroll("left")}
        className={cn(
          "absolute left-1 top-1/2 -translate-y-1/2 z-20",
          "flex h-7 w-7 items-center justify-center rounded-full",
          "bg-[hsl(var(--cp-surface))] border border-[hsl(var(--cp-border))]",
          "shadow-sm text-muted-foreground hover:text-foreground",
          "transition-all duration-200",
          atStart
            ? "opacity-0 pointer-events-none"
            : "opacity-0 group-hover:opacity-100"
        )}
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>

      {/* Rail */}
      <div
        ref={railRef}
        onScroll={updateEdges}
        className="flex gap-3 overflow-x-auto scroll-smooth px-1 py-1"
        style={{ scrollbarWidth: "none" }}
      >
        {discussions.map((d) => (
          <DiscussionCard key={d.id} discussion={d} />
        ))}
      </div>

      {/* Right fade */}
      <div
        className={cn(
          "pointer-events-none absolute right-0 top-0 bottom-0 w-10 z-10",
          "bg-gradient-to-l from-background to-transparent",
          "transition-opacity duration-200",
          atEnd ? "opacity-0" : "opacity-100"
        )}
      />
      <button
        aria-label="Scroll discussions right"
        onClick={() => scroll("right")}
        className={cn(
          "absolute right-1 top-1/2 -translate-y-1/2 z-20",
          "flex h-7 w-7 items-center justify-center rounded-full",
          "bg-[hsl(var(--cp-surface))] border border-[hsl(var(--cp-border))]",
          "shadow-sm text-muted-foreground hover:text-foreground",
          "transition-all duration-200",
          atEnd
            ? "opacity-0 pointer-events-none"
            : "opacity-0 group-hover:opacity-100"
        )}
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
