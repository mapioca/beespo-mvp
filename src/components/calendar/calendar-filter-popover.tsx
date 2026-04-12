"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Filter, Settings, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserRole, CalendarSubscription } from "@/types/database";
import { CalendarSettingsDialog } from "./calendar-settings-dialog";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";

import type { CalendarVisibility } from "./calendar-types";

interface CalendarFilterPopoverProps {
  visibility: CalendarVisibility;
  onToggleVisibility: (key: keyof CalendarVisibility) => void;
  onToggleExternalSubscription: (subscriptionId: string) => void;
  userRole: UserRole;
  onSyncComplete?: () => void;
}

export function CalendarFilterPopover({
  visibility,
  onToggleVisibility,
  onToggleExternalSubscription,
  userRole,
  onSyncComplete,
}: CalendarFilterPopoverProps) {
  const isAdmin = userRole === "admin";
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [subscriptions, setSubscriptions] = useState<CalendarSubscription[]>([]);
  const [isLoadingSubscriptions, setIsLoadingSubscriptions] = useState(true);
  const [isSyncingAll, setIsSyncingAll] = useState(false);

  // Fetch subscriptions
  useEffect(() => {
    const fetchSubscriptions = async () => {
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await (supabase
        .from("profiles") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select("workspace_id")
        .eq("id", user.id)
        .single();

      if (!profile?.workspace_id) return;

      const { data } = await (supabase
        .from("calendar_subscriptions") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select("*")
        .eq("workspace_id", profile.workspace_id)
        .eq("is_enabled", true)
        .order("name");

      setSubscriptions(data || []);
      setIsLoadingSubscriptions(false);
    };

    fetchSubscriptions();
  }, [settingsOpen]);

  const enabledSubscriptions = subscriptions.filter((s) => s.is_enabled);

  const handleSyncAll = async () => {
    if (enabledSubscriptions.length === 0) return;
    setIsSyncingAll(true);
    let successCount = 0;

    try {
      await Promise.allSettled(
        enabledSubscriptions.map(async (sub) => {
          const response = await fetch("/api/calendar/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ subscriptionId: sub.id }),
          });
          if (response.ok) successCount++;
        })
      );
      toast.success("Sync Complete", { description: `Synced ${successCount} of ${enabledSubscriptions.length} calendars.` });
      if (onSyncComplete) onSyncComplete();
    } catch {
      toast.error("Sync Failed", { description: "Failed to sync all calendars." });
    } finally {
      setIsSyncingAll(false);
    }
  };

  // Derive master toggle state
  const subStates = enabledSubscriptions.map(
    (s) => visibility.externalSubscriptions[s.id] ?? true
  );
  const allOn = subStates.length > 0 && subStates.every(Boolean);
  const someOn = subStates.some(Boolean);
  const isIndeterminate = someOn && !allOn;
  const masterChecked: boolean | "indeterminate" = isIndeterminate
    ? "indeterminate"
    : allOn;

  // Count active filters
  const beespoKeys = ["events", "announcements", "meetings", "tasks"] as const;
  const activeCount = beespoKeys.filter((k) => visibility[k]).length
    + (visibility.external ? enabledSubscriptions.filter((s) => visibility.externalSubscriptions[s.id] ?? true).length : 0);
  const totalCount = beespoKeys.length + enabledSubscriptions.length;

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="border-border/60 hover:bg-[hsl(var(--accent-warm)/0.6)] shadow-none gap-1.5"
          >
            <Filter className="h-4 w-4 stroke-[1.6]" />
            <span className="hidden sm:inline">Calendars</span>
            {!isLoadingSubscriptions && activeCount < totalCount && (
              <span className="ml-0.5 text-xs text-muted-foreground">
                {activeCount}/{totalCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-0">
          <div className="p-3 space-y-3">
            {/* Beespo Calendar section */}
            <div className="space-y-2">
              <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.2em]">
                Beespo Calendar
              </h3>
              <div className="space-y-1.5">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="filter-events"
                    checked={visibility.events}
                    onCheckedChange={() => onToggleVisibility("events")}
                  />
                  <Label
                    htmlFor="filter-events"
                    className="flex items-center gap-2 cursor-pointer text-sm"
                  >
                    <span className="w-3 h-3 rounded-sm bg-indigo-400" />
                    Events
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="filter-announcements"
                    checked={visibility.announcements}
                    onCheckedChange={() => onToggleVisibility("announcements")}
                  />
                  <Label
                    htmlFor="filter-announcements"
                    className="flex items-center gap-2 cursor-pointer text-sm"
                  >
                    <span className="w-3 h-3 rounded-sm bg-amber-400" />
                    Announcements
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="filter-meetings"
                    checked={visibility.meetings}
                    onCheckedChange={() => onToggleVisibility("meetings")}
                  />
                  <Label
                    htmlFor="filter-meetings"
                    className="flex items-center gap-2 cursor-pointer text-sm"
                  >
                    <span className="w-3 h-3 rounded-sm bg-blue-400" />
                    Meetings
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="filter-tasks"
                    checked={visibility.tasks}
                    onCheckedChange={() => onToggleVisibility("tasks")}
                  />
                  <Label
                    htmlFor="filter-tasks"
                    className="flex items-center gap-2 cursor-pointer text-sm"
                  >
                    <span className="w-3 h-3 rounded-sm bg-green-400" />
                    Tasks
                  </Label>
                </div>
              </div>
            </div>

            <Separator />

            {/* External Calendars section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.2em]">
                  External Calendars
                </h3>
                {isAdmin && enabledSubscriptions.length > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--accent-warm)/0.6)]"
                    onClick={handleSyncAll}
                    disabled={isSyncingAll}
                    title="Sync All External Calendars"
                  >
                    <RefreshCw className={cn("h-3 w-3 stroke-[1.6]", isSyncingAll && "animate-spin")} />
                  </Button>
                )}
              </div>

              {isLoadingSubscriptions ? (
                <div className="space-y-2">
                  <div className="h-5 bg-[hsl(var(--accent-warm)/0.25)] rounded animate-pulse" />
                  <div className="h-5 bg-[hsl(var(--accent-warm)/0.2)] rounded animate-pulse w-3/4" />
                </div>
              ) : enabledSubscriptions.length > 0 ? (
                <div className="space-y-1.5">
                  {/* Master "All External" toggle */}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="filter-external"
                      checked={masterChecked}
                      onCheckedChange={() => onToggleVisibility("external")}
                    />
                    <Label
                      htmlFor="filter-external"
                      className="flex items-center gap-2 cursor-pointer text-sm"
                    >
                      <span className="w-3 h-3 rounded-sm bg-purple-400" />
                      All External
                    </Label>
                  </div>

                  {/* Per-subscription toggles */}
                  {enabledSubscriptions.map((sub) => {
                    const isVisible = visibility.externalSubscriptions[sub.id] ?? true;
                    return (
                      <div
                        key={sub.id}
                        className="flex items-center space-x-2 pl-5 min-w-0"
                      >
                        <Checkbox
                          id={`filter-external-sub-${sub.id}`}
                          checked={isVisible}
                          onCheckedChange={() => onToggleExternalSubscription(sub.id)}
                        />
                        <Label
                          htmlFor={`filter-external-sub-${sub.id}`}
                          className="flex items-center gap-2 cursor-pointer text-sm min-w-0"
                        >
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: sub.color }}
                          />
                          <span className="truncate min-w-0">{sub.name}</span>
                        </Label>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No external calendars connected
                </p>
              )}
            </div>
          </div>

          {/* Manage Calendars button (admin only) */}
          {isAdmin && (
            <>
              <Separator />
              <div className="p-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-sm h-8 hover:bg-[hsl(var(--accent-warm)/0.6)]"
                  onClick={() => setSettingsOpen(true)}
                >
                  <Settings className="h-4 w-4 mr-2 stroke-[1.6]" />
                  Manage Calendars
                </Button>
              </div>
            </>
          )}
        </PopoverContent>
      </Popover>

      {/* Settings Dialog */}
      {isAdmin && (
        <CalendarSettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          onSyncComplete={onSyncComplete}
        />
      )}
    </>
  );
}
