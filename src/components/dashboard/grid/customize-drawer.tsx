"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { WIDGET_REGISTRY, getDefaultLayout } from "@/lib/dashboard/widget-registry";
import type { DashboardConfig } from "@/types/dashboard";
import type { FeatureTier } from "@/types/database";

interface CustomizeDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: DashboardConfig;
  onConfigChange: (config: DashboardConfig) => void;
  featureTier: FeatureTier | null;
}

export function CustomizeDrawer({
  open,
  onOpenChange,
  config,
  onConfigChange,
  featureTier,
}: CustomizeDrawerProps) {
  const toggleWidget = (widgetId: string) => {
    const updated = config.widgets.map((w) =>
      w.id === widgetId ? { ...w, visible: !w.visible } : w
    );
    onConfigChange({ ...config, widgets: updated });
  };

  const resetToDefault = () => {
    onConfigChange(getDefaultLayout(featureTier));
  };

  const kpiWidgets = WIDGET_REGISTRY.filter((d) => d.category === "kpi");
  const contentWidgets = WIDGET_REGISTRY.filter((d) => d.category === "content");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-80">
        <SheetHeader>
          <SheetTitle>Customize Dashboard</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div>
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
              KPI Cards
            </p>
            <div className="space-y-3">
              {kpiWidgets.map((def) => {
                const widgetConfig = config.widgets.find(
                  (w) => w.type === def.type
                );
                const isVisible = widgetConfig?.visible ?? false;

                return (
                  <div
                    key={def.type}
                    className="flex items-center justify-between py-2"
                  >
                    <p className="text-sm font-medium text-gray-900">
                      {def.label}
                    </p>
                    <Switch
                      checked={isVisible}
                      onCheckedChange={() => toggleWidget(def.type)}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
              Content Widgets
            </p>
            <div className="space-y-3">
              {contentWidgets.map((def) => {
                const widgetConfig = config.widgets.find(
                  (w) => w.type === def.type
                );
                const isVisible = widgetConfig?.visible ?? false;

                return (
                  <div
                    key={def.type}
                    className="flex items-center justify-between py-2"
                  >
                    <p className="text-sm font-medium text-gray-900">
                      {def.label}
                    </p>
                    <Switch
                      checked={isVisible}
                      onCheckedChange={() => toggleWidget(def.type)}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t pt-4">
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5"
              onClick={resetToDefault}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset to Default
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Restores the default layout for your role.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
