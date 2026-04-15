"use client";

import { useRef, useCallback, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { useNavigationStore } from "@/stores/navigation-store";
import { cn } from "@/lib/utils";
import { NavigationEntityIcon } from "@/components/dashboard/home/navigation-entity-icon";

export function HomeRecentsCarousel() {
  const recents = useNavigationStore((s) => s.recents);
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
      el.scrollBy({ left: dir === "right" ? 220 : -220, behavior: "smooth" });
      // update edges after animation
      setTimeout(updateEdges, 350);
    },
    [updateEdges]
  );

  if (recents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
        <Clock className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          Your recently visited items will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="relative group">
      {/* Left fade + arrow */}
      <div
        className={cn(
          "pointer-events-none absolute left-0 top-0 bottom-0 w-12 z-10",
          "bg-gradient-to-r from-[hsl(var(--app-island))] to-transparent",
          "transition-opacity duration-200",
          atStart ? "opacity-0" : "opacity-100"
        )}
      />
      <button
        aria-label="Scroll recents left"
        onClick={() => scroll("left")}
        className={cn(
          "absolute left-2 top-1/2 -translate-y-1/2 z-20",
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

      {/* Scrollable rail */}
      <div
        ref={railRef}
        onScroll={updateEdges}
        className="flex gap-3 overflow-x-auto scroll-smooth scrollbar-hidden px-1 py-1"
        style={{ scrollbarWidth: "none" }}
      >
        {recents.map((item) => (
          <Link
            key={`${item.entityType}-${item.id}`}
            href={item.href}
            className={cn(
              "flex-shrink-0 w-[180px] flex flex-col gap-1.5 rounded-[10px]",
              "border border-[hsl(var(--cp-border))] bg-[hsl(var(--cp-surface-2))]",
              "px-3.5 py-3 group/card",
              "hover:border-[hsl(var(--cp-border)/0.8)] hover:shadow-sm",
              "transition-all duration-150"
            )}
          >
            <NavigationEntityIcon
              entityType={item.entityType}
              className="h-4 w-4 text-muted-foreground"
            />
            <p className="text-[13px] font-medium leading-snug text-foreground line-clamp-2">
              {item.title}
            </p>
            {item.parentTitle && (
              <p className="text-[11px] text-muted-foreground truncate">
                {item.parentTitle}
              </p>
            )}
            <p className="text-[10px] text-muted-foreground/60 mt-auto capitalize">
              {item.entityType}
            </p>
          </Link>
        ))}
      </div>

      {/* Right fade + arrow */}
      <div
        className={cn(
          "pointer-events-none absolute right-0 top-0 bottom-0 w-12 z-10",
          "bg-gradient-to-l from-[hsl(var(--app-island))] to-transparent",
          "transition-opacity duration-200",
          atEnd ? "opacity-0" : "opacity-100"
        )}
      />
      <button
        aria-label="Scroll recents right"
        onClick={() => scroll("right")}
        className={cn(
          "absolute right-2 top-1/2 -translate-y-1/2 z-20",
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
