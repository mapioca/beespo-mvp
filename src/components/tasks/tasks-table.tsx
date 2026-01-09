"use client";

import { useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Check, Calendar, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Database } from "@/types/database";
import { TaskCompletionDialog } from "./task-completion-dialog";
import { TaskDetailsSheet } from "./task-details-sheet";

type Task = Database['public']['Tables']['tasks']['Row'] & {
    assignee?: { full_name: string; email?: string } | null;
    comment_count?: number;
};

interface TasksTableProps {
    tasks: Task[];
    readonly?: boolean;
}

export function TasksTable({ tasks, readonly = false }: TasksTableProps) {
    const [completionTask, setCompletionTask] = useState<{ id: string; title: string } | null>(null);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    return (
        <>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[300px]">Task</TableHead>
                            <TableHead>Assignee</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Due Date</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tasks.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    No tasks found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            tasks.map((task) => (
                                <TableRow
                                    key={task.id}
                                    className="group cursor-pointer hover:bg-muted/50"
                                    onClick={() => setSelectedTask(task)}
                                >
                                    <TableCell className="font-medium">
                                        <div className="flex flex-col">
                                            <span>{task.title}</span>
                                            {task.description && (
                                                <span className="text-xs text-muted-foreground truncate max-w-[280px]">
                                                    {task.description}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {task.assignee ? (
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-6 w-6">
                                                    <AvatarFallback className="text-[10px]">
                                                        {task.assignee.full_name.charAt(0)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="text-sm">{task.assignee.full_name}</span>
                                            </div>
                                        ) : (
                                            <span className="text-sm text-muted-foreground">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={task.status === 'completed' ? 'secondary' : 'outline'}
                                            className={cn(
                                                task.status === 'completed' && "bg-green-100 text-green-800",
                                                task.status === 'overdue' && "bg-red-100 text-red-800 border-red-200"
                                            )}
                                        >
                                            {task.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {task.due_date ? (
                                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                <Calendar className="w-3 h-3" />
                                                {format(new Date(task.due_date), "MMM d")}
                                            </div>
                                        ) : (
                                            <span className="text-sm text-muted-foreground">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                        {!readonly && task.status !== 'completed' && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 hover:text-green-600 mr-2"
                                                onClick={() => setCompletionTask({ id: task.id, title: task.title })}
                                            >
                                                <Check className="h-4 w-4" />
                                                <span className="sr-only">Complete</span>
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0"
                                            onClick={() => setSelectedTask(task)}
                                        >
                                            <MessageSquare className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {completionTask && (
                <TaskCompletionDialog
                    open={!!completionTask}
                    onOpenChange={(open) => !open && setCompletionTask(null)}
                    taskId={completionTask.id}
                    taskTitle={completionTask.title}
                    onSuccess={() => setCompletionTask(null)}
                />
            )}

            <TaskDetailsSheet
                open={!!selectedTask}
                onOpenChange={(open) => !open && setSelectedTask(null)}
                task={selectedTask}
            />
        </>
    );
}
