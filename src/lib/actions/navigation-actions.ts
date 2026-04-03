"use server";

import type { FavoriteEntityType, NavigationItemInput } from "@/lib/navigation/types";
import {
  recordRecentVisitForCurrentUser,
  removeFavoriteForCurrentUser,
  removeRecentForCurrentUser,
  toggleFavoriteForCurrentUser,
} from "@/lib/navigation/user-navigation";

export async function toggleFavorite(item: NavigationItemInput) {
  return toggleFavoriteForCurrentUser(item);
}

export async function removeFavorite(entityType: FavoriteEntityType, entityId: string) {
  return removeFavoriteForCurrentUser(entityType, entityId);
}

export async function recordRecentVisit(item: NavigationItemInput) {
  return recordRecentVisitForCurrentUser(item);
}

export async function removeRecent(entityType: FavoriteEntityType, entityId: string) {
  return removeRecentForCurrentUser(entityType, entityId);
}
