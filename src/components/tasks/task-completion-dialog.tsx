"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { completeTask } from "@/lib/actions/task-actions";
import { useToast } from "@/lib/hooks/use-toast";

interface TaskCompletionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    taskId: string;
    taskTitle: string;
    onSuccess?: () => void;
}

export function TaskCompletionDialog({
    open,
    onOpenChange,
    taskId,
    taskTitle,
    onSuccess
}: TaskCompletionDialogProps) {
    const [comment, setComment] = useState("");
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handleComplete = async () => {
        setLoading(true);
        const result = await completeTask(taskId, comment);
        setLoading(false);

        if (result.error) {
            toast({
                title: "Error completing task",
                description: result.error,
                variant: "destructive"
            });
        } else {
            toast({
                title: "Task completed",
                description: "The task has been marked as complete."
            });
            onOpenChange(false);
            setComment("");
            if (onSuccess) onSuccess();
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Complete Task</DialogTitle>
                    <DialogDescription>
                        You are completing <strong>{taskTitle}</strong>. Would you like to add a closing note?
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Label htmlFor="comment" className="mb-2 block">Closing Comment (Optional)</Label>
                    <Textarea
                        id="comment"
                        placeholder="e.g. Done sent email to..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        rows={4}
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handleComplete} disabled={loading} className="bg-green-600 hover:bg-green-700">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Mark as Complete
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
