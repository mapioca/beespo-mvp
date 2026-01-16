"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Settings, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserRole, CalendarSubscription } from "@/types/database";
import { CalendarSettingsDialog } from "./calendar-settings-dialog";
import { createClient } from "@/lib/supabase/client";

interface CalendarVisibility {
  announcements: boolean;
  meetings: boolean;
  tasks: boolean;
  external: boolean;
}

interface CalendarSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  visibility: CalendarVisibility;
  onToggleVisibility: (key: keyof CalendarVisibility) => void;
  userRole: UserRole;
}

export function CalendarSidebar({
  isOpen,
  onToggle,
  visibility,
  onToggleVisibility,
  userRole,
}: CalendarSidebarProps) {
  const isAdmin = userRole === "admin";
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [subscriptions, setSubscriptions] = useState<CalendarSubscription[]>([]);
  const [isLoadingSubscriptions, setIsLoadingSubscriptions] = useState(true);

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
          "fixed inset-y-0 left-0 z-50 w-64 bg-background border-r transform transition-transform duration-200 lg:relative lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full p-4">
          {/* Header with close button (mobile) */}
          <div className="flex items-center justify-between mb-4 lg:hidden">
            <h2 className="font-semibold">Calendars</h2>
            <Button variant="ghost" size="icon" onClick={onToggle}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Beespo Calendar section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Beespo Calendar
            </h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="announcements"
                  checked={visibility.announcements}
                  onCheckedChange={() => onToggleVisibility("announcements")}
                />
                <Label
                  htmlFor="announcements"
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <span className="w-3 h-3 rounded-sm bg-amber-400" />
                  Announcements
                </Label>
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Show Also section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Show Also
            </h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="meetings"
                  checked={visibility.meetings}
                  onCheckedChange={() => onToggleVisibility("meetings")}
                />
                <Label
                  htmlFor="meetings"
                  className="flex items-center gap-2 cursor-pointer"
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
                  className="flex items-center gap-2 cursor-pointer"
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
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              External Calendars
            </h3>

            {isLoadingSubscriptions ? (
              <div className="space-y-2">
                <div className="h-5 bg-muted rounded animate-pulse" />
                <div className="h-5 bg-muted rounded animate-pulse w-3/4" />
              </div>
            ) : enabledSubscriptions.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="external"
                    checked={visibility.external}
                    onCheckedChange={() => onToggleVisibility("external")}
                  />
                  <Label
                    htmlFor="external"
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <span className="w-3 h-3 rounded-sm bg-purple-400" />
                    All External
                  </Label>
                </div>
                {enabledSubscriptions.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center gap-2 pl-6 text-sm text-muted-foreground"
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: sub.color }}
                    />
                    <span className="truncate">{sub.name}</span>
                  </div>
                ))}
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
              className="w-full"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings className="h-4 w-4 mr-2" />
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
        />
      )}
    </>
  );
}
