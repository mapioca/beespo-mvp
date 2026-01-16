"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, AlertTriangle, XCircle, Loader2 } from "lucide-react";

export interface ValidationItem {
    id: string;
    title: string;
    status: "success" | "warning" | "error";
    message?: string;
}

export type ValidationState = "validating" | "success" | "warnings" | "error";

interface ValidationModalProps {
    open: boolean;
    onClose: () => void;
    state: ValidationState;
    items: ValidationItem[];
    onReviewAgenda: () => void;
    onProceed: () => void;
    onRetry: () => void;
    isCreating?: boolean;
}

export function ValidationModal({
    open,
    onClose,
    state,
    items,
    onReviewAgenda,
    onProceed,
    onRetry,
    isCreating = false,
}: ValidationModalProps) {
    const successItems = items.filter((i) => i.status === "success");
    const warningItems = items.filter((i) => i.status === "warning");
    const errorItems = items.filter((i) => i.status === "error");

    const getTitle = () => {
        switch (state) {
            case "validating":
                return "Validating Meeting...";
            case "success":
                return "Validation Complete";
            case "warnings":
                return "Validation Complete with Warnings";
            case "error":
                return "Validation Failed";
        }
    };

    const getDescription = () => {
        switch (state) {
            case "validating":
                return "Please wait while we validate your meeting agenda.";
            case "success":
                return "All items have been validated successfully.";
            case "warnings":
                return "Proceeding will create the meeting with default values for items listed below.";
            case "error":
                return "Unable to create the meeting due to the following issues.";
        }
    };

    const getIcon = () => {
        switch (state) {
            case "validating":
                return <Loader2 className="h-12 w-12 text-primary animate-spin" />;
            case "success":
                return <CheckCircle2 className="h-12 w-12 text-green-500" />;
            case "warnings":
                return <AlertTriangle className="h-12 w-12 text-amber-500" />;
            case "error":
                return <XCircle className="h-12 w-12 text-destructive" />;
        }
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader className="text-center sm:text-center">
                    <div className="flex justify-center mb-4">
                        {getIcon()}
                    </div>
                    <DialogTitle>{getTitle()}</DialogTitle>
                    <DialogDescription>{getDescription()}</DialogDescription>
                </DialogHeader>

                {state !== "validating" && (
                    <ScrollArea className="max-h-[300px] mt-4">
                        <div className="space-y-2">
                            {/* Success items (collapsed summary) */}
                            {successItems.length > 0 && state === "success" && (
                                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
                                    <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                                    <span className="text-sm text-green-800">
                                        {successItems.length} item{successItems.length !== 1 ? "s" : ""} validated
                                    </span>
                                </div>
                            )}

                            {/* Warning items */}
                            {warningItems.length > 0 && (
                                <div className="space-y-2">
                                    {warningItems.map((item) => (
                                        <div
                                            key={item.id}
                                            className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200"
                                        >
                                            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-amber-900">
                                                    {item.title}
                                                </p>
                                                {item.message && (
                                                    <p className="text-xs text-amber-700 mt-0.5">
                                                        {item.message}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Error items */}
                            {errorItems.length > 0 && (
                                <div className="space-y-2">
                                    {errorItems.map((item) => (
                                        <div
                                            key={item.id}
                                            className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200"
                                        >
                                            <XCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-red-900">
                                                    {item.title}
                                                </p>
                                                {item.message && (
                                                    <p className="text-xs text-red-700 mt-0.5">
                                                        {item.message}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Success items list (only if there are also warnings) */}
                            {successItems.length > 0 && state === "warnings" && (
                                <div className="mt-3 pt-3 border-t">
                                    <p className="text-xs text-muted-foreground mb-2">
                                        Validated successfully:
                                    </p>
                                    <div className="space-y-1">
                                        {successItems.map((item) => (
                                            <div
                                                key={item.id}
                                                className="flex items-center gap-2 text-sm text-muted-foreground"
                                            >
                                                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                                                <span className="truncate">{item.title}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                )}

                <DialogFooter className="mt-4 sm:justify-center gap-2">
                    {state === "validating" && (
                        <Button variant="outline" onClick={onClose} disabled>
                            Cancel
                        </Button>
                    )}

                    {state === "success" && (
                        <Button onClick={onProceed} disabled={isCreating}>
                            {isCreating ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                "Create Meeting"
                            )}
                        </Button>
                    )}

                    {state === "warnings" && (
                        <>
                            <Button variant="outline" onClick={onReviewAgenda}>
                                Review Agenda
                            </Button>
                            <Button onClick={onProceed} disabled={isCreating}>
                                {isCreating ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    "Proceed"
                                )}
                            </Button>
                        </>
                    )}

                    {state === "error" && (
                        <>
                            <Button variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button onClick={onRetry}>
                                Retry
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
