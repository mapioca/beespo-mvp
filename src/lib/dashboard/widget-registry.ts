import type { WidgetDefinition, DashboardConfig, WidgetPosition } from "@/types/dashboard";
import type { FeatureTier } from "@/types/database";

export const WIDGET_REGISTRY: WidgetDefinition[] = [
  {
    type: "sunday_morning",
    label: "Sunday Morning",
    icon: "Sun",
    defaultColumn: 0,
    tiers: ["bishopric", "organization", "support"],
    mobilePriority: 1,
  },
  {
    type: "action_inbox",
    label: "Action Inbox",
    icon: "Inbox",
    defaultColumn: 1,
    tiers: ["bishopric", "organization", "support"],
    mobilePriority: 2,
  },
  {
    type: "organizational_pulse",
    label: "Organizational Pulse",
    icon: "Activity",
    defaultColumn: 1,
    tiers: ["bishopric", "organization", "support"],
    mobilePriority: 3,
  },
];

export function getDefaultLayout(featureTier: FeatureTier | null): DashboardConfig {
  const tier = featureTier ?? "support";

  const widgets: WidgetPosition[] = [];
  let col0Order = 0;
  let col1Order = 0;

  for (const def of WIDGET_REGISTRY) {
    if (!def.tiers.includes(tier)) continue;

    const isCol0 = def.defaultColumn === 0;
    const visible =
      tier === "bishopric"
        ? true
        : def.type !== "organizational_pulse"; // org/support: hide Org Pulse by default

    widgets.push({
      id: def.type,
      type: def.type,
      column: def.defaultColumn,
      order: isCol0 ? col0Order++ : col1Order++,
      visible,
    });
  }

  return {
    version: 1,
    columns: 2,
    widgets,
  };
}
