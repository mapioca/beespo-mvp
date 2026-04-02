"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { ChevronRight, NotebookTabs, MoreHorizontal, ExternalLink, Link2, StarOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFavoritesStore } from "@/stores/favorites-store";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePathname } from "next/navigation";
import type { FavoriteItem } from "@/stores/favorites-store";

interface SidebarFavoritesSectionProps {
  isCollapsed: boolean;
}

const typeIcon: Record<FavoriteItem["type"], React.ElementType> = {
  meeting: NotebookTabs,
};

// ── Per-item row with three-dot context menu ──────────────────────────────────
function FavoriteItemRow({
  fav,
  isActive,
  compact = false,
  onMenuOpen,
}: {
  fav: FavoriteItem;
  isActive: boolean;
  compact?: boolean;
  onMenuOpen?: (open: boolean) => void;
}) {
  const removeFavorite = useFavoritesStore((s) => s.removeFavorite);
  const Icon = typeIcon[fav.type];

  const handleCopyLink = () => {
    const url = `${window.location.origin}${fav.href}`;
    navigator.clipboard.writeText(url).catch(() => {});
  };

  const handleOpenNewTab = () => {
    window.open(fav.href, "_blank", "noopener,noreferrer");
  };

  const handleOpenNewWindow = () => {
    window.open(fav.href, "_blank", "noopener,noreferrer,width=1280,height=800");
  };

  return (
    <div
      className={cn(
        "group flex items-center rounded-lg transition-colors",
        isActive ? "bg-nav-selected" : "hover:bg-nav-hover"
      )}
    >
      <Link
        href={fav.href}
        className={cn(
          "flex flex-1 min-w-0 items-center gap-2.5 px-3 transition-colors",
          compact ? "py-1.5" : "py-1.5",
          isActive ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Icon className={cn("shrink-0 stroke-[1.6]", compact ? "h-3.5 w-3.5" : "h-4 w-4")} />
        <span className="truncate text-sm">{fav.title}</span>
      </Link>

      <DropdownMenu onOpenChange={onMenuOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
          className={cn(
            "mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded transition-opacity",
            "opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100",
            "hover:bg-nav-hover focus-visible:outline-none"
          )}
            onClick={(e) => e.preventDefault()}
          >
            <MoreHorizontal className="h-3.5 w-3.5 stroke-[1.6] text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" className="w-56">
          <DropdownMenuItem onClick={handleOpenNewTab}>
            <ExternalLink className="h-4 w-4 stroke-[1.6]" />
            Open in new tab
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleOpenNewWindow}>
            <ExternalLink className="h-4 w-4 stroke-[1.6]" />
            Open in new window
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCopyLink}>
            <Link2 className="h-4 w-4 stroke-[1.6]" />
            Copy link
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => removeFavorite(fav.id, fav.type)}>
            <StarOff className="h-4 w-4 stroke-[1.6]" />
            Remove from favorites
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ── Main section component ────────────────────────────────────────────────────
export function SidebarFavoritesSection({
  isCollapsed,
}: SidebarFavoritesSectionProps) {
  const favorites = useFavoritesStore((state) => state.favorites);
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(true);

  // Flyout hover state — only active when sidebar is full-width and section is collapsed
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flyoutEnabled = !isCollapsed && !isExpanded;

  const openFlyout = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setFlyoutOpen(true);
  }, []);

  const scheduleFlyoutClose = useCallback(() => {
    closeTimerRef.current = setTimeout(() => setFlyoutOpen(false), 100);
  }, []);

  useEffect(() => {
    if (isExpanded) {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      setFlyoutOpen(false);
    }
  }, [isExpanded]);

  if (favorites.length === 0 || isCollapsed) return null;

  return (
    <div className="px-2.5 mt-3">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <Popover open={flyoutEnabled && flyoutOpen} onOpenChange={() => {}}>
          <PopoverAnchor asChild>
      <CollapsibleTrigger
        className="flex items-center gap-1 w-full px-3 py-1 rounded-md transition-colors hover:bg-nav-hover group"
              onMouseEnter={openFlyout}
              onMouseLeave={scheduleFlyoutClose}
            >
              <span className="flex-1 text-left text-[11px] font-medium text-muted-foreground">
                Favorites
              </span>
              <ChevronRight
                className={cn(
                  "h-3 w-3 shrink-0 stroke-[1.6] text-muted-foreground/50 transition-transform duration-200",
                  "opacity-0 group-hover:opacity-100",
                  isExpanded && "rotate-90 opacity-100"
                )}
              />
            </CollapsibleTrigger>
          </PopoverAnchor>

          <PopoverContent
            side="right"
            align="start"
            sideOffset={8}
            className="w-52 p-1"
            onMouseEnter={openFlyout}
            onMouseLeave={scheduleFlyoutClose}
            onOpenAutoFocus={(e) => e.preventDefault()}
            onInteractOutside={(e) => e.preventDefault()}
          >
            <p className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.2em]">
              Favorites
            </p>
            <div className="mt-0.5 space-y-0.5">
              {favorites.map((fav) => (
                <FavoriteItemRow
                  key={`${fav.type}-${fav.id}`}
                  fav={fav}
                  isActive={pathname === fav.href}
                  onMenuOpen={(open) => {
                    // Keep the flyout alive while a dropdown inside it is open
                    if (open) openFlyout();
                  }}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
          <div className="mt-0.5 space-y-0.5">
            {favorites.map((fav) => (
              <FavoriteItemRow
                key={`${fav.type}-${fav.id}`}
                fav={fav}
                isActive={pathname === fav.href}
              />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
