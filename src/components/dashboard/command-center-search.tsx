"use client";

import { Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { useCommandPaletteStore } from "@/stores/command-palette-store";

export function DashboardCommandSearch({
  className,
}: {
  className?: string;
}) {
  const open = useCommandPaletteStore((state) => state.open);

  return (
    <button
      type="button"
      onClick={open}
      className={cn(
        "inline-flex h-10 items-center gap-3 rounded-full border border-border/70 bg-background px-4 text-[13px] font-medium text-foreground transition-colors",
        "hover:bg-surface-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15",
        className
      )}
      aria-label="Open command palette"
    >
      <Search className="h-4 w-4 text-muted-foreground" />
      <span>Jump to</span>
      <span className="ml-1 rounded-full border border-border/70 bg-surface-body px-2 py-0.5 text-[11px] text-muted-foreground">
        Cmd K
      </span>
    </button>
  );
}
