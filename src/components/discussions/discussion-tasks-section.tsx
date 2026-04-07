"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";
import { format } from "date-fns";
import { Database } from "@/types/database";
import { TaskDetailsSheet } from "@/components/tasks/task-details-sheet";
import { useRouter } from "next/navigation";

type Task = Database['public']['Tables']['tasks']['Row'] & {
    assignee?: { full_name: string } | null;
};

interface DiscussionTasksSectionProps {
    initialTasks: Task[];
}

export function DiscussionTasksSection({ initialTasks }: DiscussionTasksSectionProps) {
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const router = useRouter();

    const handleTaskClick = (task: Task) => {
        setSelectedTask(task);
    };

    const handleSheetClose = (open: boolean) => {
        if (!open) {
            setSelectedTask(null);
            router.refresh();
        }
    };

    return (
        <>
            {initialTasks.length > 0 ? (
                <div className="space-y-1">
                    {initialTasks.map((task) => (
                        <div
                            key={task.id}
                            onClick={() => handleTaskClick(task)}
                            className="flex items-start justify-between gap-3 p-3 hover:bg-muted rounded-md transition-colors cursor-pointer"
                        >
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{task.title}</p>
                                {task.description && (
                                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                        {task.description}
                                    </p>
                                )}
                                <div className="flex items-center gap-3 mt-1.5">
                                    {task.assignee && (
                                        <span className="text-xs text-muted-foreground">
                                            {task.assignee.full_name}
                                        </span>
                                    )}
                                    {task.due_date && (
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <Calendar className="h-3 w-3" />
                                            {format(new Date(task.due_date + "T00:00:00"), "MMM d")}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <Badge
                                variant={task.status === 'completed' ? 'secondary' : 'outline'}
                                className="text-xs shrink-0"
                            >
                                {task.status}
                            </Badge>
                        </div>
                    ))}
                </div>
            ) : null}

            <TaskDetailsSheet
                open={!!selectedTask}
                onOpenChange={handleSheetClose}
                task={selectedTask}
            />
        </>
    );
}
