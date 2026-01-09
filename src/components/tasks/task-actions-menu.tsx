"use client";

import { useState } from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Edit, Copy, Tag, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { TaskLabelsDialog } from "./task-labels-dialog";
import { copyTask, deleteTask } from "@/lib/actions/task-actions";
import { useToast } from "@/lib/hooks/use-toast";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TaskActionsMenuProps {
    taskId: string;
    taskTitle: string;
    workspaceTaskId: string;
    onEdit?: () => void;
}

export function TaskActionsMenu({ taskId, taskTitle, workspaceTaskId, onEdit }: TaskActionsMenuProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [labelsOpen, setLabelsOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isCopying, setIsCopying] = useState(false);

    const handleEdit = () => {
        if (onEdit) {
            onEdit();
        } else {
            router.push(`/tasks/${taskId}`);
        }
    };

    const handleCopy = async () => {
        setIsCopying(true);
        try {
            const result = await copyTask(taskId);
            if (result.success) {
                toast({ title: `Task copied as ${result.newWorkspaceTaskId}` });
                router.refresh();
            } else {
                toast({ title: "Error", description: result.error || "Failed to copy task", variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to copy task", variant: "destructive" });
            console.error(error);
        } finally {
            setIsCopying(false);
        }
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const result = await deleteTask(taskId);
            if (result.success) {
                toast({ title: "Task deleted" });
                router.refresh();
            } else {
                toast({ title: "Error", description: result.error || "Failed to delete task", variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete task", variant: "destructive" });
            console.error(error);
        } finally {
            setIsDeleting(false);
            setDeleteOpen(false);
        }
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[160px]">
                    <DropdownMenuItem onClick={handleEdit}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleCopy} disabled={isCopying}>
                        <Copy className="mr-2 h-4 w-4" />
                        Make a copy
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setLabelsOpen(true)}>
                        <Tag className="mr-2 h-4 w-4" />
                        Labels
                        <span className="ml-auto text-xs text-muted-foreground">›</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onClick={() => setDeleteOpen(true)}
                        className="text-destructive focus:text-destructive"
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <TaskLabelsDialog
                open={labelsOpen}
                onOpenChange={setLabelsOpen}
                taskId={taskId}
                taskTitle={`${workspaceTaskId}: ${taskTitle}`}
            />

            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete task?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete <strong>{workspaceTaskId}</strong>: {taskTitle}.
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
