"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
            // Refresh the page to get updated task data
            router.refresh();
        }
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Tasks</CardTitle>
                    <CardDescription>
                        {initialTasks.length} task{initialTasks.length !== 1 ? "s" : ""}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {initialTasks && initialTasks.length > 0 ? (
                        <div className="space-y-2">
                            {initialTasks.map((task) => (
                                <div
                                    key={task.id}
                                    onClick={() => handleTaskClick(task)}
                                    className="block p-3 hover:bg-muted rounded-md transition-colors cursor-pointer border border-transparent hover:border-border"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{task.title}</p>
                                            {task.description && (
                                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                                    {task.description}
                                                </p>
                                            )}
                                            <div className="flex items-center gap-3 mt-2">
                                                {task.assignee && (
                                                    <span className="text-xs text-muted-foreground">
                                                        Assigned to: {task.assignee.full_name}
                                                    </span>
                                                )}
                                                {task.due_date && (
                                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                        <Calendar className="h-3 w-3" />
                                                        Due: {format(new Date(task.due_date), "MMM d")}
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
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">No tasks yet</p>
                    )}
                </CardContent>
            </Card>

            <TaskDetailsSheet
                open={!!selectedTask}
                onOpenChange={handleSheetClose}
                task={selectedTask}
            />
        </>
    );
}
