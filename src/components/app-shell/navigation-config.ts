import {
  Calendar,
  CheckSquare,
  Database,
  HandHeart,
  Home,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

export type AppShellNavItem = {
  icon: LucideIcon;
  label: string;
  href: string;
  badgeCount?: number;
};

// Derived from current Beespo sidebar/app routes.
export const APP_SHELL_NAV_ITEMS: AppShellNavItem[] = [
  { icon: Home, label: "Dashboard", href: "/dashboard" },
  { icon: Calendar, label: "Meetings", href: "/meetings" },
  { icon: HandHeart, label: "Callings", href: "/callings", badgeCount: 2 },
  { icon: Users, label: "Members", href: "/participants" },
  { icon: CheckSquare, label: "Tasks", href: "/tasks", badgeCount: 4 },
  { icon: Database, label: "Data", href: "/tables" },
  { icon: Settings, label: "Settings", href: "/settings" },
];
