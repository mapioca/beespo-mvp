"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useIsMobile } from "@/hooks/use-is-mobile";
import type {
  DashboardConfig,
  DashboardWidgetData,
  WidgetPosition,
  WidgetType,
} from "@/types/dashboard";
import { DroppableColumn } from "./droppable-column";
import { KpiCallingFillRateWidget } from "../widgets/kpi-calling-fill-rate-widget";
import { KpiMeetingReadinessWidget } from "../widgets/kpi-meeting-readiness-widget";
import { KpiActiveDiscussionsWidget } from "../widgets/kpi-active-discussions-widget";
import { TeamWorkloadWidget } from "../widgets/team-workload-widget";
import { MyTasksWidget } from "../widgets/my-tasks-widget";
import { CallingPipelineWidget } from "../widgets/calling-pipeline-widget";
import { UpcomingMeetingsWidget } from "../widgets/upcoming-meetings-widget";
import { NotebooksWidget } from "../widgets/notebooks-widget";
import { TablesWidget } from "../widgets/tables-widget";
import { FormsWidget } from "../widgets/forms-widget";

interface DashboardGridProps {
  config: DashboardConfig;
  data: DashboardWidgetData;
  onConfigChange: (config: DashboardConfig) => void;
}

function renderContentWidget(widgetType: WidgetType, data: DashboardWidgetData) {
  switch (widgetType) {
    case "team_workload":
      return <TeamWorkloadWidget data={data.teamWorkload} />;
    case "my_tasks":
      return <MyTasksWidget data={data.myTasks} />;
    case "calling_pipeline":
      return <CallingPipelineWidget data={data.callingPipeline} />;
    case "upcoming_meetings":
      return <UpcomingMeetingsWidget data={data.upcomingMeetings} />;
    case "notebooks":
      return <NotebooksWidget data={data.notebooks} />;
    case "tables":
      return <TablesWidget data={data.tables} />;
    case "forms":
      return <FormsWidget data={data.forms} />;
    default:
      return null;
  }
}

export function DashboardGrid({
  config,
  data,
  onConfigChange,
}: DashboardGridProps) {
  const isMobile = useIsMobile();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const visibleWidgets = config.widgets.filter((w) => w.visible);
  const kpiWidgets = visibleWidgets.filter((w) => w.isKpi);
  const contentWidgets = visibleWidgets.filter((w) => !w.isKpi);

  const getColumnWidgets = useCallback(
    (column: number): WidgetPosition[] =>
      contentWidgets
        .filter((w) => (isMobile ? true : w.column === column))
        .sort((a, b) => {
          if (isMobile)
            return a.column * 100 + a.order - (b.column * 100 + b.order);
          return a.order - b.order;
        }),
    [contentWidgets, isMobile]
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) return;

      const activeWidget = config.widgets.find((w) => w.id === active.id);
      if (!activeWidget || activeWidget.isKpi) return;

      const overId = over.id as string;
      let targetColumn: number | null = null;

      if (overId.startsWith("column-")) {
        targetColumn = parseInt(overId.replace("column-", ""));
      } else {
        const overWidget = config.widgets.find((w) => w.id === overId);
        if (overWidget) targetColumn = overWidget.column;
      }

      if (targetColumn !== null && activeWidget.column !== targetColumn) {
        const updated = config.widgets.map((w) =>
          w.id === active.id ? { ...w, column: targetColumn! } : w
        );
        onConfigChange({ ...config, widgets: updated });
      }
    },
    [config, onConfigChange]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const activeWidget = config.widgets.find((w) => w.id === active.id);
      if (!activeWidget || activeWidget.isKpi) return;

      const overWidget = config.widgets.find((w) => w.id === over.id);

      let targetColumn = activeWidget.column;
      if (overWidget) {
        targetColumn = overWidget.column;
      } else if ((over.id as string).startsWith("column-")) {
        targetColumn = parseInt((over.id as string).replace("column-", ""));
      }

      const columnWidgets = config.widgets
        .filter(
          (w) =>
            w.visible &&
            !w.isKpi &&
            w.column === targetColumn &&
            w.id !== active.id
        )
        .sort((a, b) => a.order - b.order);

      const overIndex = overWidget
        ? columnWidgets.findIndex((w) => w.id === over.id)
        : columnWidgets.length;

      const reordered = [...columnWidgets];
      reordered.splice(overIndex < 0 ? reordered.length : overIndex, 0, {
        ...activeWidget,
        column: targetColumn,
      });

      const updated = config.widgets.map((w) => {
        const idx = reordered.findIndex((r) => r.id === w.id);
        if (idx >= 0) return { ...w, column: targetColumn, order: idx };
        return w;
      });

      onConfigChange({ ...config, widgets: updated });
    },
    [config, onConfigChange]
  );

  const activeWidget = activeId
    ? config.widgets.find((w) => w.id === activeId)
    : null;

  // KPI row (always rendered, outside DndContext)
  const kpiRow = kpiWidgets.length > 0 && (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      {kpiWidgets
        .sort((a, b) => a.order - b.order)
        .map((widget) => {
          switch (widget.type) {
            case "kpi_calling_fill_rate":
              return (
                <KpiCallingFillRateWidget
                  key={widget.id}
                  data={data.kpiCallingFillRate}
                />
              );
            case "kpi_meeting_readiness":
              return (
                <KpiMeetingReadinessWidget
                  key={widget.id}
                  data={data.kpiMeetingReadiness}
                />
              );
            case "kpi_active_discussions":
              return (
                <KpiActiveDiscussionsWidget
                  key={widget.id}
                  data={data.kpiActiveDiscussions}
                />
              );
            default:
              return null;
          }
        })}
    </div>
  );

  // Mobile: KPI 2-col + stacked content, no DnD
  if (isMobile) {
    const allContent = getColumnWidgets(0);
    return (
      <div>
        {kpiRow}
        <div className="space-y-4">
          {allContent.map((widget) => (
            <div key={widget.id}>
              {renderContentWidget(widget.type, data)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Desktop: KPI row + 2-column DnD content grid
  return (
    <div>
      {kpiRow}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        accessibility={{
          announcements: {
            onDragStart({ active }) {
              return `Picked up widget ${active.id}`;
            },
            onDragOver({ active, over }) {
              if (over) return `Widget ${active.id} is over ${over.id}`;
              return `Widget ${active.id} is no longer over a droppable area`;
            },
            onDragEnd({ active, over }) {
              if (over) return `Widget ${active.id} was dropped on ${over.id}`;
              return `Widget ${active.id} was dropped`;
            },
            onDragCancel({ active }) {
              return `Dragging widget ${active.id} was cancelled`;
            },
          },
        }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DroppableColumn
            columnId="column-0"
            widgets={getColumnWidgets(0)}
            data={data}
          />
          <DroppableColumn
            columnId="column-1"
            widgets={getColumnWidgets(1)}
            data={data}
          />
        </div>

        <DragOverlay dropAnimation={null}>
          {activeWidget && !activeWidget.isKpi && (
            <div className="opacity-90 max-w-md">
              {renderContentWidget(activeWidget.type, data)}
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
