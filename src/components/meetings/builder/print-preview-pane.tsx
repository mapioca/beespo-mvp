"use client";

import { useMemo, useState } from "react";
import { generateMeetingMarkdown } from "@/lib/generate-meeting-markdown";
import { MarkdownRenderer } from "../markdown-renderer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CanvasItem } from "./types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/lib/toast";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface PrintPreviewPaneProps {
    title: string;
    date: Date;
    time: string;
    unitName?: string;
    presiding?: string;
    conducting?: string;
    chorister?: string;
    pianistOrganist?: string;
    meetingNotes?: string | null;
    canvasItems: CanvasItem[];
    /** Trigger validation + save flow */
    onSave: () => void;
    /** Duplicate the meeting with a new name */
    onSaveAsNew: (newTitle: string) => Promise<void>;
    /** Open the save as template flow */
    onSaveAsTemplate: () => void;
    /** Whether the save/create action is in progress */
    isCreating: boolean;
    /** Whether required fields are filled (used to enable/disable buttons) */
    isValid: boolean;
    /** Whether the current user is a leader/admin */
    isLeader: boolean;
}

export function PrintPreviewPane({
    title,
    date,
    time,
    unitName,
    presiding,
    conducting,
    chorister,
    pianistOrganist,
    meetingNotes,
    canvasItems,
    onSaveAsNew,
}: PrintPreviewPaneProps) {
    const [saveAsNewOpen, setSaveAsNewOpen] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [isSavingAsNew, setIsSavingAsNew] = useState(false);

    const markdown = useMemo(
        () =>
            generateMeetingMarkdown({
                title,
                date,
                time,
                unitName,
                presiding,
                conducting,
                chorister,
                pianistOrganist,
                meetingNotes,
                canvasItems,
            }),
        [title, date, time, unitName, presiding, conducting, chorister, pianistOrganist, meetingNotes, canvasItems]
    );

    const handleSaveAsNew = async () => {
        const trimmed = newTitle.trim();
        if (!trimmed) return;
        if (trimmed.toLowerCase() === title.trim().toLowerCase()) {
            toast.error("New meeting must have a different name");
            return;
        }
        setIsSavingAsNew(true);
        try {
            await onSaveAsNew(trimmed);
            setSaveAsNewOpen(false);
        } catch {
            // errors are toasted inside onSaveAsNew
        } finally {
            setIsSavingAsNew(false);
        }
    };

    return (
        <ScrollArea className="flex-1 bg-chrome backdrop-blur relative z-0">
            <div className="relative flex justify-center p-8 md:p-12">
                <div className="bg-paper border border-border/40 shadow-[0_20px_60px_rgba(15,23,42,0.08)] w-full max-w-[850px] min-h-[1056px] p-12 sm:p-16 relative rounded-md">
                    <MarkdownRenderer markdown={markdown} unitName={unitName} />
                </div>
            </div>

            <Dialog open={saveAsNewOpen} onOpenChange={(o) => !isSavingAsNew && setSaveAsNewOpen(o)}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Save as New Meeting</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        This will create a full copy of this agenda with a new name. The new meeting must have a different name.
                    </p>
                    <div className="space-y-1.5 mt-1">
                        <Label htmlFor="new-meeting-title">Meeting Name</Label>
                        <Input
                            id="new-meeting-title"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            placeholder="Enter a new name..."
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveAsNew();
                            }}
                            autoFocus
                        />
                        {newTitle.trim().toLowerCase() === title.trim().toLowerCase() && newTitle.trim() && (
                            <p className="text-xs text-destructive">Must be different from the current name.</p>
                        )}
                    </div>
                    <DialogFooter className="mt-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setSaveAsNewOpen(false)}
                            disabled={isSavingAsNew}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={handleSaveAsNew}
                            disabled={
                                isSavingAsNew ||
                                !newTitle.trim() ||
                                newTitle.trim().toLowerCase() === title.trim().toLowerCase()
                            }
                        >
                            {isSavingAsNew && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                            Create Copy
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </ScrollArea>
    );
}
