import type { WidgetDefinition, DashboardConfig, WidgetPosition } from "@/types/dashboard";
import type { FeatureTier } from "@/types/database";

export const WIDGET_REGISTRY: WidgetDefinition[] = [
  // KPI cards (3)
  {
    type: "kpi_calling_fill_rate",
    label: "Calling Fill Rate",
    icon: "Users",
    category: "kpi",
    defaultColumn: 0,
    tiers: ["bishopric", "organization", "support"],
    mobilePriority: 1,
  },
  {
    type: "kpi_meeting_readiness",
    label: "Meeting Readiness",
    icon: "CalendarCheck",
    category: "kpi",
    defaultColumn: 1,
    tiers: ["bishopric", "organization", "support"],
    mobilePriority: 2,
  },
  {
    type: "kpi_active_discussions",
    label: "Active Discussions",
    icon: "MessageSquare",
    category: "kpi",
    defaultColumn: 2,
    tiers: ["bishopric", "organization", "support"],
    mobilePriority: 3,
  },
  // Content widgets
  {
    type: "team_workload",
    label: "Stewardship Capacity",
    icon: "Users",
    category: "content",
    defaultColumn: 0,
    tiers: ["bishopric", "organization", "support"],
    mobilePriority: 4,
  },
  {
    type: "my_tasks",
    label: "My Tasks",
    icon: "ListTodo",
    category: "content",
    defaultColumn: 0,
    tiers: ["bishopric", "organization", "support"],
    mobilePriority: 5,
  },
  {
    type: "calling_pipeline",
    label: "Calling Pipeline",
    icon: "GitBranch",
    category: "content",
    defaultColumn: 0,
    tiers: ["bishopric", "organization"],
    mobilePriority: 6,
  },
  {
    type: "upcoming_meetings",
    label: "Upcoming Meetings",
    icon: "Calendar",
    category: "content",
    defaultColumn: 1,
    tiers: ["bishopric", "organization", "support"],
    mobilePriority: 7,
  },
  {
    type: "notebooks",
    label: "Notebooks",
    icon: "BookOpen",
    category: "content",
    defaultColumn: 1,
    tiers: ["bishopric", "organization", "support"],
    mobilePriority: 8,
  },
  {
    type: "tables",
    label: "Tables",
    icon: "Table2",
    category: "content",
    defaultColumn: 1,
    tiers: ["bishopric", "organization", "support"],
    mobilePriority: 9,
  },
  {
    type: "forms",
    label: "Forms",
    icon: "FileText",
    category: "content",
    defaultColumn: 1,
    tiers: ["bishopric", "organization", "support"],
    mobilePriority: 10,
  },
];

export function getDefaultLayout(featureTier: FeatureTier | null): DashboardConfig {
  const tier = featureTier ?? "support";

  const widgets: WidgetPosition[] = [];
  let col0Order = 0;
  let col1Order = 0;
  let kpiOrder = 0;

  for (const def of WIDGET_REGISTRY) {
    if (!def.tiers.includes(tier)) continue;

    const isKpi = def.category === "kpi";

    if (isKpi) {
      widgets.push({
        id: def.type,
        type: def.type,
        column: kpiOrder,
        order: kpiOrder++,
        visible: true,
        isKpi: true,
      });
    } else {
      const isCol0 = def.defaultColumn === 0;
      widgets.push({
        id: def.type,
        type: def.type,
        column: def.defaultColumn,
        order: isCol0 ? col0Order++ : col1Order++,
        visible: true,
        isKpi: false,
      });
    }
  }

  return {
    version: 1,
    columns: 2,
    widgets,
  };
}
