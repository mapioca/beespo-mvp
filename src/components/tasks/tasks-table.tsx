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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar as CalendarIcon, Circle, CheckCircle2, ArrowUp, ArrowDown, Minus, ArrowUpDown, CircleSlash } from "lucide-react";
import { format } from "date-fns";
import { Database } from "@/types/database";
import { TaskCompletionDialog } from "./task-completion-dialog";
import { TaskDetailsSheet } from "./task-details-sheet";
import { TaskActionsMenu } from "./task-actions-menu";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { updateTask } from "@/lib/actions/task-actions";
import { useToast } from "@/lib/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Task = Database['public']['Tables']['tasks']['Row'] & {
    assignee?: { full_name: string; email?: string } | null;
    comment_count?: number;
    workspace_task_id?: string | null;
    priority?: 'low' | 'medium' | 'high';
    labels?: Array<{ id: string; name: string; color: string }>;
};

interface TasksTableProps {
    tasks: Task[];
    profiles?: { id: string; full_name: string }[];
    sortConfig?: { key: string; direction: 'asc' | 'desc' } | null;
    onSort?: (key: string) => void;
}

function getPriorityIcon(priority?: 'low' | 'medium' | 'high') {
    switch (priority) {
        case 'high':
            return <ArrowUp className="h-4 w-4 text-destructive" />;
        case 'low':
            return <ArrowDown className="h-4 w-4 text-muted-foreground" />;
        default:
            return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
}

function getPriorityText(priority?: 'low' | 'medium' | 'high') {
    switch (priority) {
        case 'high':
            return 'High';
        case 'low':
            return 'Low';
        default:
            return 'Medium';
    }
}

export function TasksTable({ tasks, profiles = [], sortConfig, onSort }: TasksTableProps) {
    const [completionTask, setCompletionTask] = useState<{ id: string; title: string } | null>(null);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const { toast } = useToast();

    const handleUpdate = async (taskId: string, data: Record<string, unknown>) => {
        const result = await updateTask(taskId, data);
        if (result.error) {
            toast({ title: "Failed to update", description: result.error, variant: "destructive" });
        } else {
            toast({ title: "Updated" });
        }
    };

    const SortHeader = ({ column, label, className }: { column: string, label: string, className?: string }) => {
        return (
            <TableHead
                className={cn("cursor-pointer bg-white hover:bg-gray-50 transition-colors", className)}
                onClick={() => onSort?.(column)}
            >
                <div className="flex items-center space-x-1">
                    <span>{label}</span>
                    {sortConfig?.key === column ? (
                        sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                    )}
                </div>
            </TableHead>
        )
    };

    return (
        <>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow className="group">
                            <SortHeader column="workspace_task_id" label="Task" className="w-[100px]" />
                            <SortHeader column="title" label="Title" className="w-[400px]" />
                            <SortHeader column="status" label="Status" />
                            <SortHeader column="priority" label="Priority" />
                            <SortHeader column="assignee" label="Assignee" />
                            <SortHeader column="due_date" label="Due Date" />
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tasks.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
                                    No tasks found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            tasks.map((task) => (
                                <TableRow
                                    key={task.id}
                                    className="group hover:bg-muted/50"
                                >
                                    <TableCell
                                        className="text-sm cursor-pointer uppercase"
                                        onClick={() => setSelectedTask(task)}
                                    >
                                        {task.workspace_task_id || 'TASK-0000'}
                                    </TableCell>
                                    <TableCell
                                        className="font-medium cursor-pointer"
                                        onClick={() => setSelectedTask(task)}
                                    >
                                        <div className="flex flex-col gap-1">
                                            <span>{task.title}</span>
                                            {task.labels && task.labels.length > 0 && (
                                                <div className="flex gap-1 flex-wrap">
                                                    {task.labels.map((label) => (
                                                        <Badge
                                                            key={label.id}
                                                            style={{ backgroundColor: label.color }}
                                                            className="text-white border-0 text-xs"
                                                        >
                                                            {label.name}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}
                                            {task.description && (
                                                <span className="text-xs text-muted-foreground truncate max-w-[380px]">
                                                    {task.description}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Select
                                            defaultValue={['pending', 'in_progress'].includes(task.status) ? 'pending' : task.status}
                                            onValueChange={(val) => handleUpdate(task.id, { status: val })}
                                        >
                                            <SelectTrigger className="h-8 w-[140px] border-none shadow-none bg-transparent hover:bg-muted p-0 px-2 justify-start focus:ring-0">
                                                <div className="flex items-center gap-2">
                                                    {task.status === 'completed' ? (
                                                        <CheckCircle2 className="h-4 w-4 text-primary" />
                                                    ) : task.status === 'cancelled' ? (
                                                        <CircleSlash className="h-4 w-4 text-muted-foreground" />
                                                    ) : (
                                                        <Circle className="h-4 w-4 text-muted-foreground" />
                                                    )}
                                                    <span className="text-sm capitalize">
                                                        {['pending', 'in_progress'].includes(task.status) ? 'Todo' : task.status}
                                                    </span>
                                                </div>
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="pending">Todo</SelectItem>
                                                <SelectItem value="completed">Done</SelectItem>
                                                <SelectItem value="cancelled">Canceled</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <Select
                                            defaultValue={task.priority}
                                            onValueChange={(val) => handleUpdate(task.id, { priority: val })}
                                        >
                                            <SelectTrigger className="h-8 w-[110px] border-none shadow-none bg-transparent hover:bg-muted p-0 px-2 justify-start focus:ring-0">
                                                <div className="flex items-center gap-2">
                                                    {getPriorityIcon(task.priority)}
                                                    <span className="text-sm">{getPriorityText(task.priority)}</span>
                                                </div>
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="low">Low</SelectItem>
                                                <SelectItem value="medium">Medium</SelectItem>
                                                <SelectItem value="high">High</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <Select
                                            value={task.assigned_to || "unassigned"}
                                            onValueChange={(val) => handleUpdate(task.id, { assigned_to: val === "unassigned" ? null : val })}
                                        >
                                            <SelectTrigger className="h-8 w-[150px] border-none shadow-none bg-transparent hover:bg-muted p-0 px-2 justify-start focus:ring-0">
                                                {task.assignee ? (
                                                    <div className="flex items-center gap-2">
                                                        <Avatar className="h-6 w-6">
                                                            <AvatarFallback className="text-[10px]">
                                                                {task.assignee.full_name.charAt(0)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <span className="text-sm truncate max-w-[100px]">{task.assignee.full_name}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-muted-foreground pl-2">Unassigned</span>
                                                )}
                                            </SelectTrigger>
                                            <SelectContent align="start">
                                                <SelectItem value="unassigned">Unassigned</SelectItem>
                                                {profiles.map(p => (
                                                    <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="ghost" className={cn("h-8 w-auto px-2 justify-start font-normal hover:bg-muted bg-transparent shadow-none border-none", !task.due_date && "text-muted-foreground")}>
                                                    <CalendarIcon className="mr-2 h-3 w-3" />
                                                    {task.due_date ? format(new Date(task.due_date), "MMM d") : <span>Set Date</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={task.due_date ? new Date(task.due_date) : undefined}
                                                    onSelect={(date) => handleUpdate(task.id, { due_date: date ? format(date, 'yyyy-MM-dd') : null })}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </TableCell>
                                    <TableCell>
                                        <TaskActionsMenu
                                            taskId={task.id}
                                            taskTitle={task.title}
                                            workspaceTaskId={task.workspace_task_id || 'TASK-0000'}
                                            onEdit={() => setSelectedTask(task)}
                                        />
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
