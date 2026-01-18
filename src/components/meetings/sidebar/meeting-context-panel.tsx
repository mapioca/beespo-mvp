"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { LinkedNotesList } from "@/components/notes/linked-notes-list";
import { ActionToolbar } from "./action-toolbar";
import { CollapsibleDetails } from "./collapsible-details";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/lib/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
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
}

interface AutoExpandTextareaProps {
    value: string;
    onChange: (value: string) => void;
    onBlur: () => void;
    placeholder?: string;
    disabled?: boolean;
    isSaving?: boolean;
}

function AutoExpandTextarea({
    value,
    onChange,
    onBlur,
    placeholder,
    disabled,
    isSaving,
}: AutoExpandTextareaProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = "auto";
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
    }, [value]);

    return (
        <div className="relative">
            <Textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onBlur={onBlur}
                placeholder={placeholder}
                disabled={disabled || isSaving}
                className={cn(
                    "min-h-[60px] resize-none overflow-hidden bg-transparent border-transparent",
                    "hover:border-border focus:border-border transition-colors",
                    "text-sm leading-relaxed",
                    isSaving && "opacity-50"
                )}
                rows={1}
            />
            {isSaving && (
                <div className="absolute right-2 top-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
            )}
        </div>
    );
}

export function MeetingContextPanel({
    meeting,
    agendaItems,
    workspaceSlug,
    isLeader,
    totalDuration,
}: MeetingContextPanelProps) {
    const [currentMeeting, setCurrentMeeting] = useState(meeting);
    const [description, setDescription] = useState(meeting.description || "");
    const [notes, setNotes] = useState(
        typeof meeting.notes === "string" ? meeting.notes : ""
    );
    const [isSavingDescription, setIsSavingDescription] = useState(false);
    const [isSavingNotes, setIsSavingNotes] = useState(false);
    const { toast } = useToast();

    const isEditable =
        isLeader &&
        currentMeeting.status !== "completed" &&
        currentMeeting.status !== "cancelled";

    const saveDescription = useCallback(async () => {
        if (description === (currentMeeting.description || "")) return;

        setIsSavingDescription(true);
        const supabase = createClient();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from("meetings") as any)
            .update({ description: description || null })
            .eq("id", currentMeeting.id);

        setIsSavingDescription(false);

        if (error) {
            toast({
                title: "Save failed",
                description: "Could not save description. Please try again.",
                variant: "destructive",
            });
            setDescription(currentMeeting.description || "");
        } else {
            setCurrentMeeting((prev) => ({ ...prev, description: description || null }));
        }
    }, [description, currentMeeting.id, currentMeeting.description, toast]);

    const saveNotes = useCallback(async () => {
        const currentNotes = typeof currentMeeting.notes === "string" ? currentMeeting.notes : "";
        if (notes === currentNotes) return;

        setIsSavingNotes(true);
        const supabase = createClient();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from("meetings") as any)
            .update({ notes: notes || null })
            .eq("id", currentMeeting.id);

        setIsSavingNotes(false);

        if (error) {
            toast({
                title: "Save failed",
                description: "Could not save notes. Please try again.",
                variant: "destructive",
            });
            setNotes(currentNotes);
        } else {
            setCurrentMeeting((prev) => ({ ...prev, notes: notes || null }));
        }
    }, [notes, currentMeeting.id, currentMeeting.notes, toast]);

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
                    <div className="space-y-2">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Description
                        </h3>
                        {isEditable ? (
                            <AutoExpandTextarea
                                value={description}
                                onChange={setDescription}
                                onBlur={saveDescription}
                                placeholder="Add a description..."
                                isSaving={isSavingDescription}
                            />
                        ) : description ? (
                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                {description}
                            </p>
                        ) : (
                            <p className="text-sm text-muted-foreground italic">
                                No description
                            </p>
                        )}
                    </div>

                    {/* Section C: Collapsible Details Card */}
                    <div className="bg-card border rounded-lg p-4">
                        <CollapsibleDetails
                            templateName={currentMeeting.templates?.name}
                            createdByName={currentMeeting.profiles?.full_name}
                            meetingId={currentMeeting.id}
                            scheduledDate={currentMeeting.scheduled_date}
                            totalDuration={totalDuration}
                            defaultOpen={true}
                        />
                    </div>

                    {/* Section D: Meeting Notes (Editable) */}
                    <div className="space-y-2">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Notes
                        </h3>
                        {isEditable ? (
                            <AutoExpandTextarea
                                value={notes}
                                onChange={setNotes}
                                onBlur={saveNotes}
                                placeholder="Add notes..."
                                isSaving={isSavingNotes}
                            />
                        ) : notes ? (
                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                                {notes}
                            </p>
                        ) : (
                            <p className="text-sm text-muted-foreground italic">
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
