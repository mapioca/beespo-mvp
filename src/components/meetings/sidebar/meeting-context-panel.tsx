"use client";

import { useState } from "react";
import { LinkedNotesList } from "@/components/notes/linked-notes-list";
import { ActionToolbar } from "./action-toolbar";
import { CollapsibleDetails } from "./collapsible-details";
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

export function MeetingContextPanel({
    meeting,
    agendaItems,
    workspaceSlug,
    isLeader,
    totalDuration,
}: MeetingContextPanelProps) {
    const [currentMeeting, setCurrentMeeting] = useState(meeting);

    return (
        <div className="bg-muted/30 border-l h-full">
            <div className="p-6 space-y-6 h-full overflow-y-auto">
                {/* Section A: Action Toolbar */}
                <ActionToolbar
                    meeting={currentMeeting}
                    agendaItems={agendaItems}
                    workspaceSlug={workspaceSlug}
                    isLeader={isLeader}
                    onMeetingUpdate={setCurrentMeeting}
                />

                {/* Section B: Meeting Description */}
                {currentMeeting.description && (
                    <div className="space-y-2">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Description
                        </h3>
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                            {currentMeeting.description}
                        </p>
                    </div>
                )}

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

                {/* Linked Notes */}
                <LinkedNotesList entityId={currentMeeting.id} entityType="meeting" />
            </div>
        </div>
    );
}
