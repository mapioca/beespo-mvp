export type FavoriteEntityType =
  | "meeting"
  | "table"
  | "form"
  | "discussion"
  | "notebook"
  | "note";

export type NavigationIconKey = FavoriteEntityType;

export interface NavigationItemInput {
  id: string;
  entityType: FavoriteEntityType;
  title?: string;
  href?: string;
  parentTitle?: string | null;
}

export interface NavigationItem {
  id: string;
  entityType: FavoriteEntityType;
  title: string;
  href: string;
  icon: NavigationIconKey;
  parentTitle: string | null;
}

export interface NavigationFavoriteItem extends NavigationItem {
  position: number;
}

export interface NavigationRecentItem extends NavigationItem {
  lastViewedAt: string;
}

export interface UserNavigationItems {
  favorites: NavigationFavoriteItem[];
  recents: NavigationRecentItem[];
}
