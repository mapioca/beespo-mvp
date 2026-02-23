"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { WidgetType, DashboardWidgetData } from "@/types/dashboard";
import { TeamWorkloadWidget } from "../widgets/team-workload-widget";
import { MyTasksWidget } from "../widgets/my-tasks-widget";
import { CallingPipelineWidget } from "../widgets/calling-pipeline-widget";
import { UpcomingMeetingsWidget } from "../widgets/upcoming-meetings-widget";
import { NotebooksWidget } from "../widgets/notebooks-widget";
import { TablesWidget } from "../widgets/tables-widget";
import { FormsWidget } from "../widgets/forms-widget";

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

  const widgetMap: Partial<Record<WidgetType, React.ReactNode>> = {
    team_workload: (
      <TeamWorkloadWidget
        data={data.teamWorkload}
        dragHandleProps={dragHandleProps}
        isDragging={isDragging}
      />
    ),
    my_tasks: (
      <MyTasksWidget
        data={data.myTasks}
        dragHandleProps={dragHandleProps}
        isDragging={isDragging}
      />
    ),
    calling_pipeline: (
      <CallingPipelineWidget
        data={data.callingPipeline}
        dragHandleProps={dragHandleProps}
        isDragging={isDragging}
      />
    ),
    upcoming_meetings: (
      <UpcomingMeetingsWidget
        data={data.upcomingMeetings}
        dragHandleProps={dragHandleProps}
        isDragging={isDragging}
      />
    ),
    notebooks: (
      <NotebooksWidget
        data={data.notebooks}
        dragHandleProps={dragHandleProps}
        isDragging={isDragging}
      />
    ),
    tables: (
      <TablesWidget
        data={data.tables}
        dragHandleProps={dragHandleProps}
        isDragging={isDragging}
      />
    ),
    forms: (
      <FormsWidget
        data={data.forms}
        dragHandleProps={dragHandleProps}
        isDragging={isDragging}
      />
    ),
  };

  return (
    <div ref={setNodeRef} style={style}>
      {widgetMap[widgetType] ?? null}
    </div>
  );
}
