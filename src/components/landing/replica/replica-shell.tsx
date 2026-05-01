"use client";

import { type ReactNode } from "react";
import {
  Archive,
  BriefcaseBusiness,
  ChevronRight,
  BookUser,
  Home,
  Landmark,
  Megaphone,
  MicVocal,
  Search,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ReplicaPage =
  | "planner"
  | "speakers"
  | "announcements"
  | "business";

const childrenPages: { key: ReplicaPage; label: string; icon: LucideIcon }[] = [
  { key: "planner", label: "Planner", icon: Landmark },
  { key: "speakers", label: "Speakers", icon: MicVocal },
  { key: "business", label: "Business", icon: BriefcaseBusiness },
  { key: "announcements", label: "Announcements", icon: Megaphone },
];

interface ReplicaShellProps {
  active: ReplicaPage;
  breadcrumb: string;
  workspaceName?: string;
  workspaceMember?: string;
  children: ReactNode;
}

export function ReplicaShell({
  active,
  breadcrumb,
  workspaceName = "Lehi 4th Ward",
  workspaceMember = "Bishop Reeves",
  children,
}: ReplicaShellProps) {
  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl border"
      style={{
        background: "hsl(var(--app-shell))",
        borderColor: "hsl(var(--app-island-border))",
        boxShadow: "var(--landing-demo-shadow)",
      }}
    >
      <div className="flex" style={{ height: "640px" }}>
        <aside
          className="hidden h-full w-[240px] shrink-0 flex-col gap-0.5 overflow-hidden border-r px-2.5 py-3.5 lg:flex"
          style={{
            background: "var(--app-nav-bg)",
            borderColor: "var(--app-nav-border)",
          }}
        >
          <div
            className="mb-2 flex w-full flex-col gap-0.5 rounded-[8px] border px-3 py-2.5 text-left text-[12px]"
            style={{
              borderColor: "var(--app-nav-border)",
              background: "var(--app-nav-card)",
            }}
          >
            <span className="flex items-center gap-2.5">
              <span
                className="grid h-7 w-7 shrink-0 place-items-center rounded-[8px] font-serif text-[12px] font-medium italic"
                style={{
                  background: "var(--app-nav-inverse)",
                  color: "var(--app-nav-inverse-text)",
                }}
              >
                {workspaceName.charAt(0)}
              </span>
              <span className="min-w-0">
                <span
                  className="block truncate font-serif text-[14px]"
                  style={{ color: "var(--app-nav-strong)" }}
                >
                  {workspaceName}
                </span>
                <span
                  className="block truncate text-[11px]"
                  style={{ color: "var(--app-nav-muted)" }}
                >
                  {workspaceMember}
                </span>
              </span>
            </span>
          </div>

          <SidebarSectionLabel>Workspace</SidebarSectionLabel>
          <SidebarRow icon={Home} label="Home" />
          <SidebarRow icon={BookUser} label="Directory" />

          <SidebarSectionLabel className="mt-3">My Calling</SidebarSectionLabel>
          <SidebarRow
            icon={Landmark}
            label="Sacrament Meeting"
            expanded
            chevronOpen
          />
          <div className="ml-0.5 flex flex-col gap-0.5">
            {childrenPages.map((child) => (
              <SidebarRow
                key={child.key}
                icon={child.icon}
                label={child.label}
                depth={1}
                active={active === child.key}
              />
            ))}
            <SidebarRow icon={Archive} label="Archive" depth={1} />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div
            className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b px-4"
            style={{
              background: "hsl(var(--surface-canvas))",
              borderColor: "hsl(var(--landing-demo-divider))",
            }}
          >
            <nav aria-label="Breadcrumb" className="min-w-0 flex-1 overflow-hidden">
              <ol
                className="flex min-w-0 items-center gap-1.5 text-[12px] font-medium"
                style={{ color: "var(--app-nav-muted)" }}
              >
                <li>Meetings</li>
                <li style={{ color: "var(--app-nav-muted)", opacity: 0.5 }}>/</li>
                <li
                  className="font-semibold"
                  style={{ color: "var(--app-nav-strong)" }}
                >
                  {breadcrumb}
                </li>
              </ol>
            </nav>
            <div
              className="hidden items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] sm:flex"
              style={{
                borderColor: "hsl(var(--landing-demo-border))",
                color: "hsl(var(--landing-demo-subtle))",
              }}
            >
              <Search className="h-3 w-3" />
              <span>Search</span>
              <kbd
                className="ml-2 rounded px-1 py-0.5 text-[10px]"
                style={{
                  background: "hsl(var(--landing-demo-surface-2))",
                  color: "hsl(var(--landing-demo-muted))",
                }}
              >
                ⌘K
              </kbd>
            </div>
          </div>
          <div
            className="flex-1 overflow-hidden"
            style={{ background: "hsl(var(--surface-canvas))" }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarSectionLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "px-3 pb-1 pt-3 text-[11px] font-medium uppercase tracking-[0.06em]",
        className
      )}
      style={{ color: "var(--app-nav-muted)" }}
    >
      {children}
    </div>
  );
}

function SidebarRow({
  icon: Icon,
  label,
  active,
  depth = 0,
  expanded,
  chevronOpen,
}: {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  depth?: 0 | 1;
  expanded?: boolean;
  chevronOpen?: boolean;
}) {
  return (
    <div
      className={cn(
        "group relative flex w-full items-center gap-2.5 rounded-[6px] px-2.5 py-[7px] text-left text-[13.5px] transition-colors",
        depth === 1 && "py-1.5 pl-8 text-[13px]"
      )}
      style={{
        color: active
          ? "var(--app-nav-strong)"
          : "var(--app-nav-text)",
        background: active ? "var(--app-nav-active)" : "transparent",
        fontWeight: active ? 500 : 400,
      }}
    >
      <Icon
        className="h-[15px] w-[15px] shrink-0"
        strokeWidth={1.8}
        style={{
          color: active ? "var(--app-nav-strong)" : "var(--app-nav-icon)",
        }}
      />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {expanded ? (
        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 shrink-0 transition-transform",
            chevronOpen && "rotate-90"
          )}
          style={{ color: "var(--app-nav-muted)" }}
        />
      ) : null}
    </div>
  );
}
