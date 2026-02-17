"use client";

import Link from "next/link";
import { Inbox, CheckCircle2, ChevronRight, Circle } from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { ActionInboxData, DragHandleProps } from "@/types/dashboard";
import { WidgetCard } from "./widget-card";

interface ActionInboxWidgetProps {
  data: ActionInboxData;
  dragHandleProps?: DragHandleProps;
  isDragging?: boolean;
}

const priorityColors: Record<string, string> = {
  high: "text-red-500",
  medium: "text-amber-500",
  low: "text-gray-400",
};

function formatDueDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (isToday(date)) return "Due today";
  if (isPast(date)) return "Overdue";
  return `Due ${format(date, "MMM d")}`;
}

export function ActionInboxWidget({
  data,
  dragHandleProps,
  isDragging,
}: ActionInboxWidgetProps) {
  return (
    <WidgetCard
      title="Action Inbox"
      icon={<Inbox className="h-4 w-4 text-blue-500" />}
      dragHandleProps={dragHandleProps}
      isDragging={isDragging}
    >
      {data.tasks.length > 0 ? (
        <div className="space-y-1">
          {data.tasks.map((task) => {
            const dueLabel = formatDueDate(task.due_date);
            const isOverdue =
              task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date));

            return (
              <Link
                key={task.id}
                href={`/tasks/${task.id}`}
                className="flex items-start gap-3 p-2.5 -mx-2.5 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <Circle
                  className={cn(
                    "h-3.5 w-3.5 mt-1 shrink-0 fill-current",
                    priorityColors[task.priority] || "text-gray-400"
                  )}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {dueLabel && (
                      <span
                        className={cn(
                          "text-xs",
                          isOverdue
                            ? "text-red-600 font-medium"
                            : "text-muted-foreground"
                        )}
                      >
                        {dueLabel}
                      </span>
                    )}
                    {task.meeting_title && (
                      <span className="text-xs text-muted-foreground truncate">
                        {dueLabel ? "·" : ""} {task.meeting_title}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400 shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            );
          })}

          {data.totalCount > 5 && (
            <div className="pt-2 border-t mt-2">
              <Button asChild variant="ghost" size="sm" className="w-full text-xs">
                <Link href="/tasks">
                  View all {data.totalCount} tasks
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="py-6 text-center">
          <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-900">All caught up!</p>
          <p className="text-xs text-muted-foreground mt-1">
            No pending tasks assigned to you.
          </p>
        </div>
      )}
    </WidgetCard>
  );
}
