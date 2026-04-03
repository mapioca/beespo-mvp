import { create } from "zustand";
import type {
  FavoriteEntityType,
  NavigationFavoriteItem,
  NavigationItem,
  NavigationRecentItem,
} from "@/lib/navigation/types";

interface NavigationStoreState {
  favorites: NavigationFavoriteItem[];
  recents: NavigationRecentItem[];
  setNavigationItems: (items: {
    favorites: NavigationFavoriteItem[];
    recents: NavigationRecentItem[];
  }) => void;
  applyFavoriteToggle: (item: NavigationItem, favorited: boolean) => void;
  removeFavorite: (entityType: FavoriteEntityType, entityId: string) => void;
  applyRecentVisit: (item: NavigationItem, lastViewedAt: string) => void;
  removeRecent: (entityType: FavoriteEntityType, entityId: string) => void;
  isFavorite: (entityType: FavoriteEntityType, entityId: string) => boolean;
}

function syncItemMetadata<T extends NavigationItem>(
  items: T[],
  item: NavigationItem
): T[] {
  return items.map((existing) =>
    existing.entityType === item.entityType && existing.id === item.id
      ? {
          ...existing,
          title: item.title,
          href: item.href,
          icon: item.icon,
          parentTitle: item.parentTitle,
        }
      : existing
  );
}

export const useNavigationStore = create<NavigationStoreState>()((set, get) => ({
  favorites: [],
  recents: [],

  setNavigationItems: ({ favorites, recents }) => set({ favorites, recents }),

  applyFavoriteToggle: (item, favorited) =>
    set((state) => {
      const favorites = syncItemMetadata(state.favorites, item);
      const existingIndex = favorites.findIndex(
        (existing) =>
          existing.entityType === item.entityType && existing.id === item.id
      );

      if (!favorited) {
        return {
          favorites: favorites.filter(
            (existing) =>
              !(existing.entityType === item.entityType && existing.id === item.id)
          ),
        };
      }

      const maxPosition = favorites.reduce(
        (currentMax, existing) => Math.max(currentMax, existing.position),
        -1
      );

      if (existingIndex >= 0) {
        return {
          favorites,
        };
      }

      return {
        favorites: [
          ...favorites,
          {
            ...item,
            position: maxPosition + 1,
          },
        ],
      };
    }),

  removeFavorite: (entityType, entityId) =>
    set((state) => ({
      favorites: state.favorites.filter(
        (item) => !(item.entityType === entityType && item.id === entityId)
      ),
    })),

  applyRecentVisit: (item, lastViewedAt) =>
    set((state) => {
      const recents = [
        {
          ...item,
          lastViewedAt,
        },
        ...state.recents.filter(
          (existing) =>
            !(existing.entityType === item.entityType && existing.id === item.id)
        ),
      ].slice(0, 8);

      return {
        recents,
        favorites: syncItemMetadata(state.favorites, item),
      };
    }),

  removeRecent: (entityType, entityId) =>
    set((state) => ({
      recents: state.recents.filter(
        (item) => !(item.entityType === entityType && item.id === entityId)
      ),
    })),

  isFavorite: (entityType, entityId) =>
    get().favorites.some(
      (item) => item.entityType === entityType && item.id === entityId
    ),
}));
