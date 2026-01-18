"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { LinkedNotesList } from "@/components/notes/linked-notes-list";
import { ActionToolbar } from "./action-toolbar";
import { CollapsibleDetails } from "./collapsible-details";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/lib/hooks/use-toast";
import { Loader2, Plus } from "lucide-react";
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

/* ============================================
   AutoSaveTextarea - Reusable "Invisible Input" Component

   Pattern: Click-to-Edit, Save-on-Blur
   - Looks like regular text when idle (transparent bg, no border)
   - Shows subtle focus ring when active
   - Auto-saves on blur if value changed
   - Auto-resizes to fit content
============================================ */
interface AutoSaveTextareaProps {
    initialValue: string;
    onSave: (value: string) => Promise<void>;
    placeholder?: string;
    disabled?: boolean;
    minRows?: number;
    className?: string;
}

function AutoSaveTextarea({
    initialValue,
    onSave,
    placeholder = "Click to edit...",
    disabled = false,
    minRows = 1,
    className,
}: AutoSaveTextareaProps) {
    const [value, setValue] = useState(initialValue);
    const [isSaving, setIsSaving] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const initialValueRef = useRef(initialValue);

    // Sync local state when initialValue prop changes (external updates)
    useEffect(() => {
        if (initialValue !== initialValueRef.current) {
            setValue(initialValue);
            initialValueRef.current = initialValue;
            setHasUnsavedChanges(false);
        }
    }, [initialValue]);

    // Auto-resize textarea to fit content
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            // Reset height to recalculate
            textarea.style.height = "auto";
            // Set to scrollHeight for auto-grow
            textarea.style.height = `${Math.max(textarea.scrollHeight, minRows * 24)}px`;
        }
    }, [value, minRows]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setValue(e.target.value);
        setHasUnsavedChanges(e.target.value !== initialValueRef.current);
    };

    const handleBlur = async () => {
        // Only save if value actually changed
        if (!hasUnsavedChanges || value === initialValueRef.current) {
            return;
        }

        setIsSaving(true);
        try {
            await onSave(value);
            initialValueRef.current = value;
            setHasUnsavedChanges(false);
        } catch {
            // Revert to last saved value on error
            setValue(initialValueRef.current);
            setHasUnsavedChanges(false);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="relative group">
            <textarea
                ref={textareaRef}
                value={value}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder={placeholder}
                disabled={disabled || isSaving}
                rows={minRows}
                className={cn(
                    // Base styles - "invisible" look
                    "w-full resize-none bg-transparent text-sm leading-relaxed",
                    "text-foreground placeholder:text-muted-foreground",
                    // Border: invisible by default, subtle on hover/focus
                    "border border-transparent rounded-md",
                    "hover:border-border/50 hover:bg-muted/30",
                    // Focus: visible ring for accessibility
                    "focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-transparent focus:bg-muted/30",
                    // Padding with negative margin for larger click target
                    "p-2 -m-2",
                    // Transitions
                    "transition-all duration-150",
                    // Disabled/Saving states
                    disabled && "cursor-not-allowed opacity-60",
                    isSaving && "opacity-50",
                    className
                )}
            />
            {/* Saving indicator */}
            {isSaving && (
                <div className="absolute right-0 top-0 p-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
            )}
            {/* Unsaved changes indicator (subtle dot) */}
            {hasUnsavedChanges && !isSaving && (
                <div className="absolute right-0 top-0 p-2">
                    <div className="h-2 w-2 rounded-full bg-amber-500" title="Unsaved changes" />
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
    currentUserName,
}: MeetingContextPanelProps) {
    const [currentMeeting, setCurrentMeeting] = useState(meeting);
    const [isAddingDescription, setIsAddingDescription] = useState(false);
    const { toast } = useToast();

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
            toast({
                title: "Save failed",
                description: "Could not save description. Please try again.",
                variant: "destructive",
            });
            throw error; // Trigger revert in AutoSaveTextarea
        }

        // Update local state optimistically
        setCurrentMeeting((prev) => ({ ...prev, description: value || null }));

        // If cleared, reset adding state
        if (!value?.trim()) {
            setIsAddingDescription(false);
        }
    }, [currentMeeting.id, toast]);

    // Save notes to database (now expects HTML from TipTap)
    const saveNotes = useCallback(async (value: string) => {
        const supabase = createClient();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from("meetings") as any)
            .update({ notes: value || null })
            .eq("id", currentMeeting.id);

        if (error) {
            toast({
                title: "Save failed",
                description: "Could not save notes. Please try again.",
                variant: "destructive",
            });
            throw error;
        }

        // Update local state optimistically
        setCurrentMeeting((prev) => ({ ...prev, notes: value || null }));
    }, [currentMeeting.id, toast]);

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
                            templateName={currentMeeting.templates?.name}
                            createdByName={currentMeeting.profiles?.full_name}
                            meetingId={currentMeeting.id}
                            scheduledDate={currentMeeting.scheduled_date}
                            totalDuration={totalDuration}
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
