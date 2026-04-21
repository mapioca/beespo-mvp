"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState, type ElementType } from "react";
import {
  Archive,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  CheckSquare,
  ChevronRight,
  ClipboardList,
  Clock3,
  Database,
  FileText,
  Home,
  Inbox,
  Landmark,
  Library,
  LogOut,
  Megaphone,
  MessageSquare,
  Moon,
  NotebookPen,
  NotebookTabs,
  Palette,
  PanelTop,
  Pin,
  Search,
  Settings,
  Sun,
  Table2,
  UserRoundCheck,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme/theme-provider";
import { useCommandPaletteStore } from "@/stores/command-palette-store";
import { useNavigationStore } from "@/stores/navigation-store";
import type {
  FavoriteEntityType,
  NavigationFavoriteItem,
  NavigationRecentItem,
} from "@/lib/navigation/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type SidebarItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  soon?: boolean;
  match?: "exact" | "prefix";
  activeAliases?: string[];
  children?: SidebarItem[];
};

type SidebarSection = {
  label: string;
  items: SidebarItem[];
};

type SavedItem = NavigationFavoriteItem | NavigationRecentItem;

const savedIconByType: Record<FavoriteEntityType, ElementType> = {
  meeting: NotebookTabs,
  table: Table2,
  form: ClipboardList,
  discussion: MessageSquare,
  notebook: BookOpen,
  note: FileText,
};

const sections: SidebarSection[] = [
  {
    label: "Workspace",
    items: [
      { href: "/dashboard", label: "Home", icon: Home, match: "exact" },
      { href: "/inbox", label: "Inbox", icon: Inbox, match: "prefix" },
      { href: "/calendar", label: "Calendar", icon: CalendarDays, match: "prefix", activeAliases: ["/schedule"] },
      { href: "/tasks", label: "Tasks", icon: CheckSquare, match: "prefix" },
      { href: "/interviews", label: "Interviews", icon: UserRoundCheck, soon: true },
      { href: "/callings", label: "Callings", icon: BriefcaseBusiness, match: "prefix" },
    ],
  },
  {
    label: "Meetings",
    items: [
      {
        href: "/meetings/sacrament-meeting/planner",
        label: "Sacrament Meeting",
        icon: Landmark,
        match: "prefix",
        children: [
          { href: "/meetings/sacrament-meeting/planner", label: "Program Planner", icon: Landmark, match: "prefix" },
          { href: "/meetings/sacrament-meeting/speaker-planner", label: "Speaker Planner", icon: UserRoundCheck, match: "prefix" },
          { href: "/meetings/sacrament-meeting/business", label: "Business", icon: BriefcaseBusiness, match: "prefix" },
          { href: "/meetings/sacrament-meeting/archive", label: "Archive", icon: Archive, match: "prefix" },
        ],
      },
      { href: "/meetings/ward-council", label: "Ward Council", icon: UsersRound, soon: true },
      { href: "/meetings/agendas", label: "Agendas", icon: NotebookPen, match: "prefix" },
      { href: "/meetings/programs", label: "Programs", icon: PanelTop, match: "prefix" },
      { href: "/meetings/agendas/discussions", label: "Discussions", icon: MessageSquare, match: "prefix" },
      { href: "/meetings/assignments", label: "Assignments", icon: ClipboardList, match: "prefix" },
      { href: "/meetings/announcements", label: "Announcements", icon: Megaphone, match: "prefix" },
    ],
  },
  {
    label: "Library",
    items: [{ href: "/library", label: "Library", icon: Library, match: "prefix" }],
  },
  {
    label: "Data",
    items: [
      { href: "/forms", label: "Forms", icon: ClipboardList, match: "prefix" },
      { href: "/tables", label: "Tables", icon: Database, match: "prefix" },
      { href: "/notebooks", label: "Notebooks", icon: BookOpen, match: "prefix" },
    ],
  },
];

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "W";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

function isItemActive(pathname: string, item: SidebarItem) {
  if (item.children?.some((child) => isItemActive(pathname, child))) return true;
  if (item.activeAliases?.some((alias) => pathname === alias || pathname.startsWith(`${alias}/`))) {
    return true;
  }
  if (item.match === "exact") return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function NavRow({
  item,
  depth = 0,
  isOpen,
  onToggle,
}: {
  item: SidebarItem;
  depth?: number;
  isOpen?: boolean;
  onToggle?: () => void;
}) {
  const pathname = usePathname();
  const Icon = item.icon;
  const active = isItemActive(pathname, item);
  const hasChildren = Boolean(item.children?.length);

  const className = cn(
    "group relative flex w-full items-center gap-2.5 rounded-[6px] px-2.5 py-[7px] text-left text-[13.5px] text-[var(--app-nav-text)] transition-colors duration-75",
    depth > 0 && "py-1.5 pl-8 text-[13px]",
    item.soon ? "cursor-default opacity-75" : "hover:bg-[var(--app-nav-hover)]",
    active && !item.soon && "bg-[var(--app-nav-active)] font-medium text-[var(--app-nav-strong)]"
  );

  const content = (
    <>
      <Icon className={cn("h-[15px] w-[15px] shrink-0 text-[var(--app-nav-icon)]", active && "text-[var(--app-nav-strong)]")} strokeWidth={1.8} />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.soon ? <span className="rounded-full border border-[var(--app-nav-border)] bg-[var(--app-nav-card)] px-1.5 py-px text-[10px] uppercase tracking-[0.04em] text-[var(--app-nav-muted)]">Soon</span> : null}
      {hasChildren ? (
        <ChevronRight className={cn("h-3.5 w-3.5 shrink-0 text-[var(--app-nav-muted)] transition-transform", isOpen && "rotate-90")} />
      ) : null}
    </>
  );

  if (hasChildren) {
    return (
      <button type="button" className={className} onClick={onToggle} aria-expanded={isOpen}>
        {content}
      </button>
    );
  }

  if (item.soon) {
    return <div className={className}>{content}</div>;
  }

  return (
    <Link href={item.href} className={className}>
      {content}
    </Link>
  );
}

function SavedItemsGroup({
  title,
  icon: Icon,
  items,
}: {
  title: string;
  icon: LucideIcon;
  items: SavedItem[];
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const visibleItems = items.slice(0, 6);

  return (
    <div>
      <button
        type="button"
        className="group flex w-full items-center gap-2.5 rounded-[6px] px-2.5 py-[7px] text-left text-[13.5px] text-[var(--app-nav-text)] transition-colors duration-75 hover:bg-[var(--app-nav-hover)]"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <Icon className="h-[15px] w-[15px] shrink-0 text-[var(--app-nav-icon)]" strokeWidth={1.8} />
        <span className="min-w-0 flex-1 truncate">{title}</span>
        <span className="text-[11px] tabular-nums text-[var(--app-nav-muted)]">{items.length}</span>
        <ChevronRight className={cn("h-3.5 w-3.5 shrink-0 text-[var(--app-nav-muted)] transition-transform", open && "rotate-90")} />
      </button>

      {open ? (
        <div className="mt-0.5 flex flex-col gap-0.5">
          {visibleItems.length === 0 ? (
            <div className="px-8 py-1.5 text-[12px] text-[var(--app-nav-muted)]">None yet</div>
          ) : (
            visibleItems.map((item) => {
              const SavedIcon = savedIconByType[item.entityType];
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={`${item.entityType}-${item.id}`}
                  href={item.href}
                  className={cn(
                    "flex min-w-0 items-center gap-2.5 rounded-[6px] px-2.5 py-1.5 pl-8 text-[13px] text-[var(--app-nav-icon)] transition-colors duration-75 hover:bg-[var(--app-nav-hover)] hover:text-[var(--app-nav-strong)]",
                    active && "bg-[var(--app-nav-active)] font-medium text-[var(--app-nav-strong)]"
                  )}
                >
                  <SavedIcon className="h-[15px] w-[15px] shrink-0" strokeWidth={1.8} />
                  <span className="truncate">{item.title}</span>
                </Link>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}

export function AppSidebar({
  userName,
  userId,
  workspaceName,
}: {
  userName: string;
  userId: string;
  workspaceName?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const toggleCommandPalette = useCommandPaletteStore((state) => state.toggle);
  const favorites = useNavigationStore((state) => state.favorites);
  const recents = useNavigationStore((state) => state.recents);
  const { theme, setTheme } = useTheme();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    "/meetings/sacrament-meeting/planner": true,
  });

  const workspaceLabel = workspaceName || "Workspace";
  const workspaceInitials = getInitials(workspaceLabel);

  const sectionsWithOpenState = useMemo(
    () =>
      sections.map((section) => ({
        ...section,
        items: section.items.map((item) => ({
          ...item,
          isOpen:
            openGroups[item.href] ??
            Boolean(item.children?.some((child) => isItemActive(pathname, child))),
        })),
      })),
    [openGroups, pathname]
  );

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <aside className="flex h-full w-[248px] shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-[var(--app-nav-border)] bg-[var(--app-nav-bg)] px-2.5 py-3.5">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="mb-2 flex w-full flex-col gap-0.5 rounded-[8px] border border-[var(--app-nav-border)] bg-[var(--app-nav-card)] px-3 py-2.5 text-left text-[12px] transition-colors hover:bg-[var(--app-nav-hover)]"
            aria-label="Workspace menu"
          >
            <span className="flex items-center gap-2.5">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[8px] bg-[var(--app-nav-inverse)] font-serif text-[12px] font-medium italic text-[var(--app-nav-inverse-text)]">
                {workspaceInitials}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-serif text-[14px] text-[var(--app-nav-strong)]">{workspaceLabel}</span>
                <span className="block truncate text-[11px] text-[var(--app-nav-muted)]">{userName || userId.slice(0, 8)}</span>
              </span>
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="right" className="w-52">
          <DropdownMenuItem asChild>
            <Link href="/settings">
              <Settings className="h-4 w-4" />
              Workspace settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={toggleCommandPalette}>
            <Search className="h-4 w-4" />
            Search
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setTheme("warm")}>
            <Palette className="h-4 w-4" />
            Warm mode
            {theme === "warm" ? <span className="ml-auto text-xs text-muted-foreground">On</span> : null}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("light")}>
            <Sun className="h-4 w-4" />
            Light mode
            {theme === "light" ? <span className="ml-auto text-xs text-muted-foreground">On</span> : null}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("dark")}>
            <Moon className="h-4 w-4" />
            Dark mode
            {theme === "dark" ? <span className="ml-auto text-xs text-muted-foreground">On</span> : null}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
            <LogOut className="h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {sectionsWithOpenState.map((section) => (
        <div key={section.label}>
          <div className="px-3 pb-1 pt-3 text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--app-nav-muted)]">
            {section.label}
          </div>
          <div className="flex flex-col gap-0.5">
            {section.items.map((item) => (
              <div key={item.href}>
                <NavRow
                  item={item}
                  isOpen={item.isOpen}
                  onToggle={() =>
                    setOpenGroups((current) => ({
                      ...current,
                      [item.href]: !item.isOpen,
                    }))
                  }
                />
                {item.children?.length && item.isOpen ? (
                  <div className="mt-0.5 flex flex-col gap-0.5">
                    {item.children.map((child) => (
                      <NavRow key={child.href} item={child} depth={1} />
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ))}

      <div>
        <div className="px-3 pb-1 pt-3 text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--app-nav-muted)]">
          Shortcuts
        </div>
        <div className="flex flex-col gap-0.5">
          <SavedItemsGroup title="Favorites" icon={Pin} items={favorites} />
          <SavedItemsGroup title="Recents" icon={Clock3} items={recents} />
        </div>
      </div>
    </aside>
  );
}
