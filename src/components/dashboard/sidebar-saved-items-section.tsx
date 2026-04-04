"use client";

import { useCallback, useEffect, useRef, useState, type ElementType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  ChevronRight,
  ClipboardList,
  ExternalLink,
  FileText,
  Link2,
  MessageSquare,
  MoreHorizontal,
  NotebookTabs,
  StarOff,
  Table2,
  Undo2,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
import { removeFavorite, removeRecent } from "@/lib/actions/navigation-actions";
import { useNavigationStore } from "@/stores/navigation-store";
import { toast } from "@/lib/toast";
import type {
  FavoriteEntityType,
  NavigationFavoriteItem,
  NavigationRecentItem,
} from "@/lib/navigation/types";

type SavedItem = NavigationFavoriteItem | NavigationRecentItem;

interface SidebarSavedItemsSectionProps {
  title: string;
  items: SavedItem[];
  isCollapsed: boolean;
  itemType: "favorites" | "recents";
}

const iconByType: Record<FavoriteEntityType, ElementType> = {
  meeting: NotebookTabs,
  table: Table2,
  form: ClipboardList,
  discussion: MessageSquare,
  notebook: BookOpen,
  note: FileText,
};

function SavedItemRow({
  item,
  isActive,
  itemType,
  onMenuOpen,
}: {
  item: SavedItem;
  isActive: boolean;
  itemType: "favorites" | "recents";
  onMenuOpen?: (open: boolean) => void;
}) {
  const applyFavoriteToggle = useNavigationStore((state) => state.applyFavoriteToggle);
  const applyRecentVisit = useNavigationStore((state) => state.applyRecentVisit);
  const removeFavoriteFromStore = useNavigationStore((state) => state.removeFavorite);
  const removeRecentFromStore = useNavigationStore((state) => state.removeRecent);
  const Icon = iconByType[item.entityType];

  const handleCopyLink = () => {
    const url = `${window.location.origin}${item.href}`;
    navigator.clipboard.writeText(url).catch(() => {});
  };

  const handleRemove = async () => {
    if (itemType === "favorites") {
      removeFavoriteFromStore(item.entityType, item.id);
      const result = await removeFavorite(item.entityType, item.id);
      if ("error" in result) {
        applyFavoriteToggle(item, true);
        toast.error(result.error ?? "Unable to remove favorite.");
        return;
      }
      return;
    }

    removeRecentFromStore(item.entityType, item.id);
    const result = await removeRecent(item.entityType, item.id);
    if ("error" in result) {
      applyRecentVisit(item, "lastViewedAt" in item ? item.lastViewedAt : new Date().toISOString());
      toast.error(result.error ?? "Unable to remove recent item.");
    }
  };

  return (
    <div
      className={cn(
        "group flex items-center rounded-lg transition-colors",
        isActive ? "bg-nav-selected" : "hover:bg-nav-hover"
      )}
    >
      <Link
        href={item.href}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-2.5 px-3 py-1.5 transition-colors",
          isActive ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Icon className="h-4 w-4 shrink-0 stroke-[1.6]" />
        <div className="min-w-0">
          <p className="truncate text-sm">{item.title}</p>
          {item.parentTitle ? (
            <p className="truncate text-[11px] text-muted-foreground/90">
              {item.parentTitle}
            </p>
          ) : null}
        </div>
      </Link>

      <DropdownMenu onOpenChange={onMenuOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-opacity",
              "opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100",
              "hover:bg-nav-hover focus-visible:outline-none"
            )}
            onClick={(event) => event.preventDefault()}
          >
            <MoreHorizontal className="h-3.5 w-3.5 stroke-[1.6] text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" className="w-56">
          <DropdownMenuItem onClick={() => window.open(item.href, "_blank", "noopener,noreferrer")}>
            <ExternalLink className="h-4 w-4 stroke-[1.6]" />
            Open in new tab
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              window.open(item.href, "_blank", "noopener,noreferrer,width=1280,height=800")
            }
          >
            <ExternalLink className="h-4 w-4 stroke-[1.6]" />
            Open in new window
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCopyLink}>
            <Link2 className="h-4 w-4 stroke-[1.6]" />
            Copy link
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleRemove}>
            {itemType === "favorites" ? (
              <StarOff className="h-4 w-4 stroke-[1.6]" />
            ) : (
              <Undo2 className="h-4 w-4 stroke-[1.6]" />
            )}
            {itemType === "favorites" ? "Remove from favorites" : "Remove from recents"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function SidebarSavedItemsSection({
  title,
  items,
  isCollapsed,
  itemType,
}: SidebarSavedItemsSectionProps) {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(true);
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
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
      setFlyoutOpen(false);
    }
  }, [isExpanded]);

  if (isCollapsed) {
    return null;
  }

  return (
    <div className="mt-4 px-2.5">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <Popover open={flyoutEnabled && flyoutOpen} onOpenChange={() => {}}>
          <PopoverAnchor asChild>
            <CollapsibleTrigger
              className="group flex w-full items-center gap-1 rounded-md px-3 py-1.5 transition-colors hover:bg-nav-hover"
              onMouseEnter={openFlyout}
              onMouseLeave={scheduleFlyoutClose}
            >
              <span className="flex-1 text-left text-xs font-medium text-nav-muted">
                {title}
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
            className="w-56 p-1"
            onMouseEnter={openFlyout}
            onMouseLeave={scheduleFlyoutClose}
            onOpenAutoFocus={(event) => event.preventDefault()}
            onInteractOutside={(event) => event.preventDefault()}
          >
            <p className="px-2 py-1 text-xs font-medium text-nav-muted">
              {title}
            </p>
            <div className="mt-0.5 space-y-0.5">
              {items.length === 0 ? (
                <p className="px-2 py-2 text-xs text-muted-foreground">
                  {itemType === "favorites"
                    ? "No favorites yet."
                    : "No recent items yet."}
                </p>
              ) : (
                items.map((item) => (
                  <SavedItemRow
                    key={`${item.entityType}-${item.id}`}
                    item={item}
                    itemType={itemType}
                    isActive={pathname === item.href}
                    onMenuOpen={(open) => {
                      if (open) {
                        openFlyout();
                      }
                    }}
                  />
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>

        <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
          <div className="mt-0.5 space-y-0.5">
            {items.length === 0 ? (
              <p className="px-3 py-1.5 text-xs text-muted-foreground">
                {itemType === "favorites"
                  ? "No favorites yet."
                  : "No recent items yet."}
              </p>
            ) : (
              items.map((item) => (
                <SavedItemRow
                  key={`${item.entityType}-${item.id}`}
                  item={item}
                  itemType={itemType}
                  isActive={pathname === item.href}
                />
              ))
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
