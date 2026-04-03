"use client";

import { useEffect } from "react";
import { recordRecentVisit } from "@/lib/actions/navigation-actions";
import { useNavigationStore } from "@/stores/navigation-store";
import type { NavigationItemInput } from "@/lib/navigation/types";

interface RecentVisitTrackerProps {
  item: NavigationItemInput | null;
}

export function RecentVisitTracker({ item }: RecentVisitTrackerProps) {
  const applyRecentVisit = useNavigationStore((state) => state.applyRecentVisit);

  useEffect(() => {
    if (!item) {
      return;
    }

    let cancelled = false;
    const lastViewedAt = new Date().toISOString();

    if (item.href) {
      applyRecentVisit(
        {
          id: item.id,
          entityType: item.entityType,
          title: item.title ?? "Untitled",
          href: item.href,
          icon: item.entityType,
          parentTitle: item.parentTitle ?? null,
        },
        lastViewedAt
      );
    }

    void recordRecentVisit(item).then((result) => {
      if (cancelled || "error" in result) {
        if ("error" in result) {
          const normalized = (result.error ?? "").toLowerCase();
          const isMissingRecentTable =
            normalized.includes("could not find the table") &&
            normalized.includes("'public.user_recent_items'");
          if (!isMissingRecentTable) {
            console.error("Failed to record recent visit:", result.error);
          }
        }
        return;
      }

      applyRecentVisit(result.item, result.lastViewedAt);
    });

    return () => {
      cancelled = true;
    };
  }, [applyRecentVisit, item]);

  return null;
}
