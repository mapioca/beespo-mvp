"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import type { WidgetPosition, DashboardWidgetData } from "@/types/dashboard";
import { SortableWidget } from "./sortable-widget";

interface DroppableColumnProps {
  columnId: string;
  widgets: WidgetPosition[];
  data: DashboardWidgetData;
}

export function DroppableColumn({
  columnId,
  widgets,
  data,
}: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: columnId });
  const widgetIds = widgets.map((w) => w.id);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "space-y-4 min-h-[200px] rounded-lg transition-colors",
        isOver && "bg-primary/5"
      )}
    >
      <SortableContext items={widgetIds} strategy={verticalListSortingStrategy}>
        {widgets.map((widget) => (
          <SortableWidget
            key={widget.id}
            id={widget.id}
            widgetType={widget.type}
            data={data}
          />
        ))}
      </SortableContext>
    </div>
  );
}
