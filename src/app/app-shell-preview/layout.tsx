import type { ReactNode } from "react";
import Link from "next/link";
import { Inbox, Star, Archive, CircleDot } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";

function SecondaryPanelPreview() {
  const items = [
    { label: "All activity", icon: Inbox, href: "#", count: 18, active: true },
    { label: "Starred", icon: Star, href: "#", count: 5 },
    { label: "Archived", icon: Archive, href: "#", count: 12 },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-4">
        <h2 className="text-sm font-semibold text-foreground">Secondary Panel</h2>
        <p className="mt-1 text-xs text-muted-foreground">Inbox/sub-navigation preview</p>
      </div>

      <div className="flex-1 space-y-1 p-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center justify-between rounded-md px-2 py-2 text-sm transition-colors duration-200 ${
                item.active
                  ? "bg-primary-light text-primary"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <span className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {item.label}
              </span>
              <Badge variant="secondary" className="rounded-full px-2 py-0 text-xs">
                {item.count}
              </Badge>
            </Link>
          );
        })}
      </div>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2">
          <CircleDot className="h-4 w-4 text-success" />
          <span className="text-xs text-muted-foreground">3 team members online</span>
        </div>
      </div>
    </div>
  );
}

export default function AppShellPreviewLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell
      secondaryPanel={<SecondaryPanelPreview />}
      userName="Preview User"
      userEmail="preview@beespo.com"
    >
      {children}
    </AppShell>
  );
}
