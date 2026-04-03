"use client";

import { useRef } from "react";
import { useNavigationStore } from "@/stores/navigation-store";
import type { UserNavigationItems } from "@/lib/navigation/types";

interface NavigationStoreHydratorProps {
  initialItems: UserNavigationItems;
}

export function NavigationStoreHydrator({
  initialItems,
}: NavigationStoreHydratorProps) {
  const hydratedRef = useRef(false);

  if (!hydratedRef.current) {
    useNavigationStore.getState().setNavigationItems(initialItems);
    hydratedRef.current = true;
  }

  return null;
}
