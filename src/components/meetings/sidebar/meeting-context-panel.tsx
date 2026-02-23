"use client";

import { useState, useEffect, useCallback } from "react";
import { LinkedNotesList } from "@/components/notes/linked-notes-list";
import { ActionToolbar } from "./action-toolbar";
import { CollapsibleDetails } from "./collapsible-details";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { AutoSaveTextarea } from "@/components/ui/auto-save-textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";
import { Plus } from "lucide-react";
import { Database } from "@/types/database";

type Meeting = Database["public"]["Tables"]["meetings"]["Row"] & {
    templates?: { name: string } | null;
    profiles?: { full_name: string } | null;
};
type AgendaItem = Database["public"]["Tables"]["agenda_items"]["Row"] & {
    hymn?: { title: string; hymn_number: number } | null;
};

interface MeetingContextPanelProps {
    meeting: Meeting;
    agendaItems: AgendaItem[];
    workspaceSlug: string | null;
    isLeader: boolean;
    totalDuration: number;
    currentUserName: string;
}

// Helper to get initials from name
function getInitials(name: string): string {
    return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}

export function MeetingContextPanel({
    meeting,
    agendaItems,
    workspaceSlug,
    isLeader,
                                        currentUserName,
}: MeetingContextPanelProps) {
    const [currentMeeting, setCurrentMeeting] = useState(meeting);
    const [isAddingDescription, setIsAddingDescription] = useState(false);

    // Sync meeting state when prop changes (e.g., external updates)
    useEffect(() => {
        setCurrentMeeting(meeting);
    }, [meeting]);

    const isEditable =
        isLeader &&
        currentMeeting.status !== "completed" &&
        currentMeeting.status !== "cancelled";

    // Check if description is empty
    const hasDescription = Boolean(currentMeeting.description?.trim());

    // Save description to database
    const saveDescription = useCallback(async (value: string) => {
        const supabase = createClient();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from("meetings") as any)
            .update({ description: value || null })
            .eq("id", currentMeeting.id);

        if (error) {
            toast.error("Save failed", { description: "Could not save description. Please try again." });
            throw error; // Trigger revert in AutoSaveTextarea
        }

        // Update local state optimistically
        setCurrentMeeting((prev) => ({ ...prev, description: value || null }));

        // If cleared, reset adding state
        if (!value?.trim()) {
            setIsAddingDescription(false);
        }
    }, [currentMeeting.id]);

    // Save notes to database (now expects HTML from TipTap)
    const saveNotes = useCallback(async (value: string) => {
        const supabase = createClient();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from("meetings") as any)
            .update({ notes: value || null })
            .eq("id", currentMeeting.id);

        if (error) {
            toast.error("Save failed", { description: "Could not save notes. Please try again." });
            throw error;
        }

        // Update local state optimistically
        setCurrentMeeting((prev) => ({ ...prev, notes: value || null }));
    }, [currentMeeting.id]);

    return (
        <div className="bg-muted/30 border-l h-full flex flex-col overflow-hidden">
            {/* ============================================
                Section A: Action Toolbar (Pinned)
                - shrink-0: Never shrinks, always visible at top
                - Sticky actions remain accessible regardless of scroll
            ============================================ */}
            <div className="shrink-0 p-6 pb-4 border-b border-border/50">
                <ActionToolbar
                    meeting={currentMeeting}
                    agendaItems={agendaItems}
                    workspaceSlug={workspaceSlug}
                    isLeader={isLeader}
                    onMeetingUpdate={setCurrentMeeting}
                />
            </div>

            {/* ============================================
                Scrollable Content Area (Reactive)
                - flex-1: Expands/contracts with viewport height
                - min-h-0: Critical for nested flex scrolling
                - overflow-y-auto: Independent internal scrolling
                On small screens (13" laptop), this area shrinks
                and becomes scrollable while keeping toolbar visible
            ============================================ */}
            <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="p-6 pt-4 space-y-6">
                    {/* Section B: Meeting Description (Editable) */}
                    <div className="space-y-1">
                        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Description
                        </h3>
                        {isEditable ? (
                            // Editable mode: Show button when empty, textarea when adding/has content
                            !hasDescription && !isAddingDescription ? (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setIsAddingDescription(true)}
                                    className="h-auto py-2 px-0 text-muted-foreground hover:text-foreground hover:bg-transparent justify-start font-normal"
                                >
                                    <Plus className="h-4 w-4 mr-1.5" />
                                    Add description
                                </Button>
                            ) : (
                                <AutoSaveTextarea
                                    initialValue={currentMeeting.description || ""}
                                    onSave={saveDescription}
                                    placeholder="Add a description..."
                                    minRows={2}
                                />
                            )
                        ) : currentMeeting.description ? (
                            <p className="text-sm text-foreground leading-relaxed py-2">
                                {currentMeeting.description}
                            </p>
                        ) : (
                            <p className="text-sm text-muted-foreground italic py-2">
                                No description
                            </p>
                        )}
                    </div>

                    {/* Section C: Collapsible Details Card */}
                    <div className="bg-card border rounded-lg p-4">
                        <CollapsibleDetails
                            meeting={currentMeeting}
                            isEditable={isEditable}
                            onMeetingUpdate={setCurrentMeeting}
                            defaultOpen={true}
                        />
                    </div>

                    {/* Section D: Meeting Notes (Rich Text Editor) */}
                    <div className="space-y-2 mt-4">
                        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Notes
                        </h3>
                        {isEditable ? (
                            // Jira-style layout: Avatar + Editor
                            <div className="flex gap-3">
                                <Avatar className="h-8 w-8 shrink-0 mt-1">
                                    <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                                        {getInitials(currentUserName || "U")}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <RichTextEditor
                                        content={typeof currentMeeting.notes === "string" ? currentMeeting.notes : ""}
                                        onSave={saveNotes}
                                        placeholder="Add a note..."
                                    />
                                </div>
                            </div>
                        ) : currentMeeting.notes && typeof currentMeeting.notes === "string" ? (
                            // Read-only: Render HTML content
                            <div
                                className="text-sm text-foreground leading-relaxed py-2 prose-sm max-w-none [&_p]:my-2 [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_li]:my-1"
                                dangerouslySetInnerHTML={{ __html: currentMeeting.notes }}
                            />
                        ) : (
                            <p className="text-sm text-muted-foreground italic py-2">
                                No notes
                            </p>
                        )}
                    </div>

                    {/* Section E: Linked Notes */}
                    <LinkedNotesList entityId={currentMeeting.id} entityType="meeting" />
                </div>
            </div>
        </div>
    );
}
