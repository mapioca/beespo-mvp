import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface FavoriteItem {
  id: string;
  type: "meeting";
  title: string;
  href: string;
}

interface FavoritesStore {
  favorites: FavoriteItem[];
  addFavorite: (item: FavoriteItem) => void;
  removeFavorite: (id: string, type: FavoriteItem["type"]) => void;
  isFavorite: (id: string, type: FavoriteItem["type"]) => boolean;
  toggleFavorite: (item: FavoriteItem) => void;
}

export const useFavoritesStore = create<FavoritesStore>()(
  persist(
    (set, get) => ({
      favorites: [],

      addFavorite: (item) =>
        set((state) => ({ favorites: [...state.favorites, item] })),

      removeFavorite: (id, type) =>
        set((state) => ({
          favorites: state.favorites.filter(
            (f) => !(f.id === id && f.type === type)
          ),
        })),

      isFavorite: (id, type) =>
        get().favorites.some((f) => f.id === id && f.type === type),

      toggleFavorite: (item) => {
        const exists = get().isFavorite(item.id, item.type);
        if (exists) {
          get().removeFavorite(item.id, item.type);
        } else {
          get().addFavorite(item);
        }
      },
    }),
    { name: "beespo-favorites" }
  )
);
