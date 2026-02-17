"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { WidgetType } from "@/types/dashboard";
import type { DashboardWidgetData } from "@/types/dashboard";
import { SundayMorningWidget } from "../widgets/sunday-morning-widget";
import { ActionInboxWidget } from "../widgets/action-inbox-widget";
import { OrgPulseWidget } from "../widgets/org-pulse-widget";

interface SortableWidgetProps {
  id: string;
  widgetType: WidgetType;
  data: DashboardWidgetData;
}

export function SortableWidget({ id, widgetType, data }: SortableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  };

  const dragHandleProps = { attributes, listeners };

  return (
    <div ref={setNodeRef} style={style}>
      {widgetType === "sunday_morning" && (
        <SundayMorningWidget
          data={data.sundayMorning}
          dragHandleProps={dragHandleProps}
          isDragging={isDragging}
        />
      )}
      {widgetType === "action_inbox" && (
        <ActionInboxWidget
          data={data.actionInbox}
          dragHandleProps={dragHandleProps}
          isDragging={isDragging}
        />
      )}
      {widgetType === "organizational_pulse" && (
        <OrgPulseWidget
          data={data.organizationalPulse}
          dragHandleProps={dragHandleProps}
          isDragging={isDragging}
        />
      )}
    </div>
  );
}
