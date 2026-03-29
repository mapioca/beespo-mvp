"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Settings, X, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserRole, CalendarSubscription } from "@/types/database";
import { CalendarSettingsDialog } from "./calendar-settings-dialog";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";

import type { CalendarVisibility } from "./calendar-types";

interface CalendarSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  visibility: CalendarVisibility;
  onToggleVisibility: (key: keyof CalendarVisibility) => void;
  onToggleExternalSubscription: (subscriptionId: string) => void;
  userRole: UserRole;
  onSyncComplete?: () => void;
}


export function CalendarSidebar({
  isOpen,
  onToggle,
  visibility,
  onToggleVisibility,
  onToggleExternalSubscription,
  userRole,
  onSyncComplete,
}: CalendarSidebarProps) {
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
  }, [settingsOpen]); // Refresh when settings dialog closes

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
  // Radix Checkbox supports "indeterminate" as a special checked value
  const masterChecked: boolean | "indeterminate" = isIndeterminate
    ? "indeterminate"
    : allOn;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-background/80 border-r border-border/60 transform transition-transform duration-200 lg:relative lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full p-4">
          {/* Header with close button (mobile) */}
          <div className="flex items-center justify-between mb-4 lg:hidden">
            <h2 className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Calendars</h2>
            <Button variant="ghost" size="icon" onClick={onToggle}>
              <X className="h-5 w-5 stroke-[1.6]" />
            </Button>
          </div>

          {/* Beespo Calendar section */}
          <div className="space-y-3">
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.2em]">
              Beespo Calendar
            </h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="events"
                  checked={visibility.events}
                  onCheckedChange={() => onToggleVisibility("events")}
                />
                <Label
                  htmlFor="events"
                  className="flex items-center gap-2 cursor-pointer text-sm"
                >
                  <span className="w-3 h-3 rounded-sm bg-indigo-400" />
                  Events
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="announcements"
                  checked={visibility.announcements}
                  onCheckedChange={() => onToggleVisibility("announcements")}
                />
                <Label
                  htmlFor="announcements"
                  className="flex items-center gap-2 cursor-pointer text-sm"
                >
                  <span className="w-3 h-3 rounded-sm bg-amber-400" />
                  Announcements
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="meetings"
                  checked={visibility.meetings}
                  onCheckedChange={() => onToggleVisibility("meetings")}
                />
                <Label
                  htmlFor="meetings"
                  className="flex items-center gap-2 cursor-pointer text-sm"
                >
                  <span className="w-3 h-3 rounded-sm bg-blue-400" />
                  Meetings
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="tasks"
                  checked={visibility.tasks}
                  onCheckedChange={() => onToggleVisibility("tasks")}
                />
                <Label
                  htmlFor="tasks"
                  className="flex items-center gap-2 cursor-pointer text-sm"
                >
                  <span className="w-3 h-3 rounded-sm bg-green-400" />
                  Tasks
                </Label>
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          {/* External Calendars section */}
          <div className="space-y-3">
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
              <div className="space-y-2">
                {/* Master "All External" toggle */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="external"
                    checked={masterChecked}
                    onCheckedChange={() => onToggleVisibility("external")}
                  />
                  <Label
                    htmlFor="external"
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
                        id={`external-sub-${sub.id}`}
                        checked={isVisible}
                        onCheckedChange={() => onToggleExternalSubscription(sub.id)}
                      />
                      <Label
                        htmlFor={`external-sub-${sub.id}`}
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

          {/* Spacer */}
          <div className="flex-1" />

          {/* Manage Calendars button (admin only) */}
          {isAdmin && (
            <Button
              variant="outline"
              className="w-full border-border/60 hover:bg-[hsl(var(--accent-warm)/0.6)] shadow-none"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings className="h-4 w-4 mr-2 stroke-[1.6]" />
              Manage Calendars
            </Button>
          )}
        </div>
      </aside>

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
