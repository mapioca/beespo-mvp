"use client";

import Link from "next/link";
import { ListTodo, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MyTasksData, DragHandleProps } from "@/types/dashboard";
import { WidgetCard } from "./widget-card";

interface Props {
  data: MyTasksData;
  dragHandleProps?: DragHandleProps;
  isDragging?: boolean;
}

const priorityConfig = {
  high: {
    label: "High",
    className:
      "border-[hsl(var(--dashboard-pill-critical-border))] bg-[hsl(var(--dashboard-pill-critical-bg))] text-[hsl(var(--dashboard-pill-critical-text))]",
  },
  medium: {
    label: "Med",
    className:
      "border-[hsl(var(--dashboard-pill-warning-border))] bg-[hsl(var(--dashboard-pill-warning-bg))] text-[hsl(var(--dashboard-pill-warning-text))]",
  },
  low: {
    label: "Low",
    className:
      "border-[hsl(var(--dashboard-pill-muted-border))] bg-[hsl(var(--dashboard-pill-muted-bg))] text-[hsl(var(--dashboard-pill-muted-text))]",
  },
} as const;

export function MyTasksWidget({ data, dragHandleProps, isDragging }: Props) {
  return (
    <WidgetCard
      title="My Tasks"
      icon={<ListTodo className="h-4 w-4 text-muted-foreground" />}
      dragHandleProps={dragHandleProps}
      isDragging={isDragging}
    >
      {data.tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No pending tasks
        </p>
      ) : (
        <div className="space-y-1">
          {data.tasks.map((task) => {
            const priority = priorityConfig[task.priority];
            return (
              <Link
                key={task.id}
                href={`/tasks/${task.id}`}
                className="dashboard-widget-row dashboard-widget-row-hover -mx-2 flex items-center gap-3 rounded-md px-2 py-2 transition-colors"
              >
                <span
                  className={cn(
                    "shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold",
                    priority.className
                  )}
                >
                  {priority.label}
                </span>
                <span className="flex-1 truncate text-sm text-foreground">
                  {task.title}
                </span>
                {task.due_date && (
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(task.due_date + "T00:00:00").toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
      {data.totalCount > 5 && (
        <Link
          href="/tasks"
          className="mt-3 flex items-center gap-1 border-t pt-3 text-xs font-medium text-[hsl(var(--dashboard-link))] transition-colors hover:text-[hsl(var(--dashboard-link-hover))]"
        >
          View all {data.totalCount} tasks
          <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </WidgetCard>
  );
}
