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
import { SundayMorningWidget } from "../widgets/sunday-morning-widget";
import { ActionInboxWidget } from "../widgets/action-inbox-widget";
import { OrgPulseWidget } from "../widgets/org-pulse-widget";

interface DashboardGridProps {
  config: DashboardConfig;
  data: DashboardWidgetData;
  onConfigChange: (config: DashboardConfig) => void;
}

function WidgetOverlay({
  widgetType,
  data,
}: {
  widgetType: WidgetType;
  data: DashboardWidgetData;
}) {
  switch (widgetType) {
    case "sunday_morning":
      return <SundayMorningWidget data={data.sundayMorning} />;
    case "action_inbox":
      return <ActionInboxWidget data={data.actionInbox} />;
    case "organizational_pulse":
      return <OrgPulseWidget data={data.organizationalPulse} />;
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

  // Get widgets for a specific column, sorted by order
  const getColumnWidgets = useCallback(
    (column: number): WidgetPosition[] =>
      visibleWidgets
        .filter((w) => (isMobile ? true : w.column === column))
        .sort((a, b) => {
          if (isMobile) return a.column * 100 + a.order - (b.column * 100 + b.order);
          return a.order - b.order;
        }),
    [visibleWidgets, isMobile]
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) return;

      const activeWidget = config.widgets.find((w) => w.id === active.id);
      if (!activeWidget) return;

      // Determine target column from over id
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
      const overWidget = config.widgets.find((w) => w.id === over.id);

      if (!activeWidget) return;

      let targetColumn = activeWidget.column;
      if (overWidget) {
        targetColumn = overWidget.column;
      } else if ((over.id as string).startsWith("column-")) {
        targetColumn = parseInt((over.id as string).replace("column-", ""));
      }

      // Reorder within the target column
      const columnWidgets = config.widgets
        .filter((w) => w.visible && w.column === targetColumn && w.id !== active.id)
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

  // Mobile: single column
  if (isMobile) {
    const allWidgets = getColumnWidgets(0);
    return (
      <div className="space-y-4">
        {allWidgets.map((widget) => {
          switch (widget.type) {
            case "sunday_morning":
              return (
                <SundayMorningWidget key={widget.id} data={data.sundayMorning} />
              );
            case "action_inbox":
              return (
                <ActionInboxWidget key={widget.id} data={data.actionInbox} />
              );
            case "organizational_pulse":
              return (
                <OrgPulseWidget key={widget.id} data={data.organizationalPulse} />
              );
          }
        })}
      </div>
    );
  }

  // Desktop: multi-column DnD grid
  return (
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
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
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
        {activeWidget && (
          <div className="opacity-90 max-w-md">
            <WidgetOverlay widgetType={activeWidget.type} data={data} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
