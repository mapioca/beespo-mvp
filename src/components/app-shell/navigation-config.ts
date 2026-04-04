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
  group?: "core" | "workspace" | "account";
};

// Derived from current Beespo sidebar/app routes.
export const APP_SHELL_NAV_ITEMS: AppShellNavItem[] = [
  { icon: Home, label: "Dashboard", href: "/dashboard", group: "core" },
  { icon: Calendar, label: "Meetings", href: "/meetings", group: "core" },
  { icon: HandHeart, label: "Callings", href: "/callings", badgeCount: 2, group: "core" },
  { icon: Users, label: "Members", href: "/participants", group: "workspace" },
  { icon: CheckSquare, label: "Tasks", href: "/tasks", badgeCount: 4, group: "workspace" },
  { icon: Database, label: "Data", href: "/tables", group: "workspace" },
  { icon: Settings, label: "Settings", href: "/settings", group: "account" },
];
