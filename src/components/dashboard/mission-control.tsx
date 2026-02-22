"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { saveDashboardLayout } from "@/lib/actions/dashboard-actions";
import dynamic from "next/dynamic";
import type { DashboardConfig, DashboardWidgetData } from "@/types/dashboard";
import type { FeatureTier } from "@/types/database";
import type { ReleaseNote } from "@/types/release-notes";
import { DashboardGrid } from "./grid/dashboard-grid";
import { CustomizeDrawer } from "./grid/customize-drawer";

const ReleaseNoteModal = dynamic(
  () => import("@/components/release-notes/release-note-modal").then((m) => m.ReleaseNoteModal),
  { ssr: false }
);

interface MissionControlProps {
  config: DashboardConfig;
  data: DashboardWidgetData;
  featureTier: FeatureTier | null;
  profileName: string;
  latestReleaseNote?: ReleaseNote | null;
  lastReadReleaseNoteAt?: string | null;
}

export function MissionControl({
  config: initialConfig,
  data,
  featureTier,
  profileName,
  latestReleaseNote,
  lastReadReleaseNoteAt,
}: MissionControlProps) {
  const [config, setConfig] = useState<DashboardConfig>(initialConfig);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced save on config changes
  const handleConfigChange = useCallback(
    (newConfig: DashboardConfig) => {
      setConfig(newConfig);

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        const result = await saveDashboardLayout(newConfig);
        if (result.error) {
          toast.error("Failed to save layout");
        }
      }, 500);
    },
    []
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  // Greeting based on time of day
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-gray-50/50">
      <div className="p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              {greeting}, {profileName?.split(" ")[0] || "there"}
            </h1>
            <p className="text-muted-foreground mt-1">
              Your mission control at a glance
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDrawerOpen(true)}
            className="gap-1.5"
          >
            <Settings2 className="h-4 w-4" />
            Customize
          </Button>
        </div>

        {/* Grid */}
        <DashboardGrid
          config={config}
          data={data}
          onConfigChange={handleConfigChange}
        />

        {/* Customize Drawer */}
        <CustomizeDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          config={config}
          onConfigChange={handleConfigChange}
          featureTier={featureTier}
        />

        {/* Release Note Modal */}
        {latestReleaseNote && (
          <ReleaseNoteModal
            releaseNote={latestReleaseNote}
            lastReadAt={lastReadReleaseNoteAt ?? null}
          />
        )}
      </div>
    </div>
  );
}
