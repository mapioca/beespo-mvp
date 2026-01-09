"use client";

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Database } from "@/types/database";

type Task = Database['public']['Tables']['tasks']['Row'] & {
    assignee?: { full_name: string } | null;
};

interface TaskCardProps {
    task: Task;
    onComplete?: (id: string) => void;
    readonly?: boolean;
}

export function TaskCard({ task, onComplete, readonly = false }: TaskCardProps) {
    const isCompleted = task.status === 'completed';
    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !isCompleted;

    return (
        <Card className={cn(
            "transition-all",
            isCompleted && "bg-muted/50 opacity-70",
            isOverdue && "border-red-200 bg-red-50/30"
        )}>
            <CardHeader className="p-4 pb-2 flex flex-row justify-between items-start space-y-0">
                <div className="space-y-1">
                    <h3 className={cn("font-semibold leading-none", isCompleted && "line-through text-muted-foreground")}>
                        {task.title}
                    </h3>
                    {task.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
                    )}
                </div>
                {isCompleted ? (
                    <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">
                        Done
                    </Badge>
                ) : isOverdue ? (
                    <Badge variant="destructive" className="font-normal">Overdue</Badge>
                ) : (
                    <Badge variant="outline" className="font-normal">Pending</Badge>
                )}
            </CardHeader>
            <CardContent className="p-4 py-2">
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {task.due_date && (
                        <div className={cn("flex items-center gap-1", isOverdue && "text-red-500 font-medium")}>
                            <Calendar className="w-3 h-3" />
                            {format(new Date(task.due_date), "MMM d, yyyy")}
                        </div>
                    )}
                    {task.assignee && (
                        <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {task.assignee.full_name}
                        </div>
                    )}
                </div>
            </CardContent>
            {!readonly && !isCompleted && onComplete && (
                <CardFooter className="p-2 border-t bg-muted/10">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full h-8 text-xs hover:bg-green-50 hover:text-green-700"
                        onClick={() => onComplete(task.id)}
                    >
                        <Check className="w-3 h-3 mr-2" />
                        Mark Complete
                    </Button>
                </CardFooter>
            )}
        </Card>
    );
}
