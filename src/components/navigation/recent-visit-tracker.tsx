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

    void recordRecentVisit(item).then((result) => {
      if (cancelled || "error" in result) {
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
