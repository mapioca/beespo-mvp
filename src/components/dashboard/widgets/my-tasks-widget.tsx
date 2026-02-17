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
  high: { label: "High", className: "bg-red-100 text-red-700" },
  medium: { label: "Med", className: "bg-amber-100 text-amber-700" },
  low: { label: "Low", className: "bg-gray-100 text-gray-600" },
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
                className="flex items-center gap-3 py-2 px-2 -mx-2 rounded-md hover:bg-gray-50 transition-colors"
              >
                <span
                  className={cn(
                    "text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0",
                    priority.className
                  )}
                >
                  {priority.label}
                </span>
                <span className="text-sm text-gray-900 truncate flex-1">
                  {task.title}
                </span>
                {task.due_date && (
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(task.due_date).toLocaleDateString("en-US", {
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
          className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 mt-3 pt-3 border-t"
        >
          View all {data.totalCount} tasks
          <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </WidgetCard>
  );
}
