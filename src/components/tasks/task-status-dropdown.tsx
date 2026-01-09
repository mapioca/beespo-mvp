"use client";

import { useState } from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Circle, CircleDot, CheckCircle2, CircleSlash } from "lucide-react";
import { updateTask } from "@/lib/actions/task-actions";
import { useRouter } from "next/navigation";
import { useToast } from "@/lib/hooks/use-toast";

interface TaskStatusDropdownProps {
    taskId: string;
    currentStatus: string;
}

const STATUS_OPTIONS = [
    { value: "pending", label: "Todo", icon: Circle },
    { value: "in_progress", label: "In Progress", icon: CircleDot },
    { value: "completed", label: "Done", icon: CheckCircle2 },
    { value: "cancelled", label: "Canceled", icon: CircleSlash },
];

export function TaskStatusDropdown({ taskId, currentStatus }: TaskStatusDropdownProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [isUpdating, setIsUpdating] = useState(false);

    const currentOption = STATUS_OPTIONS.find((opt) => opt.value === currentStatus) || STATUS_OPTIONS[0];
    const Icon = currentOption.icon;

    const handleStatusChange = async (newStatus: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent row click
        if (newStatus === currentStatus || isUpdating) return;

        setIsUpdating(true);
        try {
            const result = await updateTask(taskId, { status: newStatus });
            if (result.success) {
                toast({
                    title: "Status updated",
                });
                router.refresh();
            } else {
                toast({
                    title: "Error",
                    description: result.error || "Failed to update status",
                    variant: "destructive",
                });
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to update status",
                variant: "destructive",
            });
            console.error(error);
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    className="flex items-center gap-2 hover:bg-accent rounded px-2 py-1 -mx-2 -my-1"
                    onClick={(e) => e.stopPropagation()}
                    disabled={isUpdating}
                >
                    <Icon className={`h-4 w-4 ${currentStatus === 'completed' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="text-sm">{currentOption.label}</span>
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
                {STATUS_OPTIONS.map((option) => {
                    const OptionIcon = option.icon;
                    return (
                        <DropdownMenuItem
                            key={option.value}
                            onClick={(e) => handleStatusChange(option.value, e)}
                            className="flex items-center gap-2"
                        >
                            <OptionIcon className="h-4 w-4" />
                            <span>{option.label}</span>
                            {option.value === currentStatus && (
                                <CheckCircle2 className="h-3 w-3 ml-auto" />
                            )}
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
