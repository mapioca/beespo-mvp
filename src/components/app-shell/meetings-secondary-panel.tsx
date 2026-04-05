"use client";

import Link from "next/link";
import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, Loader2, Megaphone, BriefcaseBusiness, Library } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { useMeetingsUiStore } from "@/stores/meetings-ui-store";

const ITEMS = [
  { key: "agendas", label: "Agendas", href: "/meetings/agendas", icon: CalendarDays },
  { key: "announcements", label: "Announcements", href: "/meetings/announcements", icon: Megaphone },
  { key: "businessItems", label: "Business Items", href: "/meetings/business", icon: BriefcaseBusiness },
  { key: "templates", label: "Templates", href: "/templates/library", icon: Library },
];

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

type MeetingsPanelCounts = {
  agendas: number;
  announcements: number;
  businessItems: number;
  templates: number;
};

const AGENDA_CATEGORIES = [
  { value: "mine", label: "My Meetings" },
  { value: "shared", label: "Shared with Me" },
  { value: "all", label: "All" },
] as const;

export function MeetingsSecondaryPanel() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = React.useTransition();
  const [pendingCategory, setPendingCategory] = React.useState<"mine" | "shared" | "all" | null>(null);
  const setCategoryNavigating = useMeetingsUiStore((s) => s.setCategoryNavigating);
  const [counts, setCounts] = React.useState<MeetingsPanelCounts>({
    agendas: 0,
    announcements: 0,
    businessItems: 0,
    templates: 0,
  });

  React.useEffect(() => {
    let cancelled = false;

    async function loadCounts() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: profile } = await (supabase.from("profiles") as ReturnType<typeof supabase.from>)
        .select("workspace_id")
        .eq("id", user.id)
        .single();

      const workspaceId = (profile as { workspace_id?: string | null } | null)?.workspace_id ?? null;
      if (!workspaceId) return;

      const [meetingsResult, announcementsResult, businessItemsResult, templatesResult] =
        await Promise.all([
          (supabase.from("meetings") as ReturnType<typeof supabase.from>)
            .select("id", { head: true, count: "exact" })
            .eq("workspace_id", workspaceId),
          (supabase.from("announcements") as ReturnType<typeof supabase.from>)
            .select("id", { head: true, count: "exact" })
            .eq("workspace_id", workspaceId),
          (supabase.from("business_items") as ReturnType<typeof supabase.from>)
            .select("id", { head: true, count: "exact" })
            .eq("workspace_id", workspaceId),
          (supabase.from("templates") as ReturnType<typeof supabase.from>)
            .select("id", { head: true, count: "exact" })
            .or(`workspace_id.is.null,workspace_id.eq.${workspaceId}`),
        ]);

      if (cancelled) return;

      setCounts({
        agendas: meetingsResult.count ?? 0,
        announcements: announcementsResult.count ?? 0,
        businessItems: businessItemsResult.count ?? 0,
        templates: templatesResult.count ?? 0,
      });
    }

    void loadCounts();

    return () => {
      cancelled = true;
    };
  }, []);

  const isAgendasRoute = pathname === "/meetings/agendas" || pathname.startsWith("/meetings/agendas/");
  const selectedCategory = searchParams.get("category");
  const activeCategory: "mine" | "shared" | "all" =
    selectedCategory === "shared" || selectedCategory === "all" ? selectedCategory : "mine";

  React.useEffect(() => {
    if (pendingCategory === activeCategory) {
      setPendingCategory(null);
      setCategoryNavigating(false);
    }
  }, [activeCategory, pendingCategory, setCategoryNavigating]);

  React.useEffect(() => {
    if (!isPending && pendingCategory === null) {
      setCategoryNavigating(false);
    }
  }, [isPending, pendingCategory, setCategoryNavigating]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-200 px-4 py-4">
        <h2 className="text-lg font-semibold text-gray-900">Meetings</h2>
        <p className="mt-1 text-xs text-gray-400">Section navigation</p>
      </div>

      <div className="flex-1 space-y-1 p-2">
        {ITEMS.map((item) => {
          const active = isActivePath(pathname, item.href);
          const Icon = item.icon;
          const count = counts[item.key as keyof MeetingsPanelCounts] ?? 0;
          const showAgendaCategories = isAgendasRoute && item.key === "agendas";

          return (
            <React.Fragment key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center justify-between rounded-md px-2 py-2 text-sm transition-colors duration-200",
                  active
                    ? "bg-primary-light text-primary"
                    : "text-gray-600 hover:bg-gray-100"
                )}
              >
                <span className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {item.label}
                </span>
                <Badge variant="secondary" className="rounded-full px-2 py-0 text-xs">
                  {count}
                </Badge>
              </Link>

              {showAgendaCategories ? (
                <div className="mt-2 px-2 pb-1">
                  <div className="relative ml-2 pl-4">
                    <span className="pointer-events-none absolute bottom-0 left-0 top-0 w-[2px] bg-gray-300" aria-hidden />
                    <div className="space-y-0">
                      {AGENDA_CATEGORIES.map((category) => {
                        const selected = activeCategory === category.value;
                        const loading = isPending && pendingCategory === category.value;

                        return (
                          <button
                            key={category.value}
                            type="button"
                            onClick={() => {
                              if (category.value === activeCategory) return;
                              setCategoryNavigating(true);
                              setPendingCategory(category.value);
                              startTransition(() => {
                                router.push(`/meetings/agendas?category=${category.value}`);
                              });
                            }}
                            className={cn(
                              "group relative flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors",
                              selected
                                ? "bg-gray-50 text-gray-900 hover:bg-gray-100"
                                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                            )}
                            aria-busy={isPending && pendingCategory === category.value}
                            >
                            <span
                              className={cn(
                                "pointer-events-none absolute -left-4 bottom-0 top-0 w-[2px] transition-colors",
                                selected ? "bg-black" : "bg-transparent group-hover:bg-gray-500"
                              )}
                              aria-hidden
                            />
                            <span>{category.label}</span>
                            {loading ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-500" />
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : null}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
