"use client";

import { useState } from "react";
import { CalendarDays, Clock } from "lucide-react";
import { MeetingStatusBadge } from "@/components/meetings/meeting-status-badge";
import { EditableAgendaItemList } from "@/components/meetings/editable";
import { MeetingContextPanel } from "@/components/meetings/sidebar";
import { formatMeetingDateTime } from "@/lib/meeting-helpers";
import { Database } from "@/types/database";

type Meeting = Database["public"]["Tables"]["meetings"]["Row"] & {
    templates?: { name: string } | null;
    profiles?: { full_name: string } | null;
};
type AgendaItem = Database["public"]["Tables"]["agenda_items"]["Row"] & {
    hymn?: { title: string; hymn_number: number } | null;
};

interface MeetingDetailContentProps {
    meeting: Meeting;
    agendaItems: AgendaItem[];
    workspaceSlug: string | null;
    isLeader: boolean;
    totalDuration: number;
}

export function MeetingDetailContent({
    meeting,
    agendaItems: initialAgendaItems,
    workspaceSlug,
    isLeader,
}: MeetingDetailContentProps) {
    const [agendaItems, setAgendaItems] = useState(initialAgendaItems);

    // Recalculate total duration when items change
    const totalDuration = agendaItems.reduce(
        (acc, item) => acc + (item.duration_minutes || 0),
        0
    );

    // Only allow editing if user is a leader and meeting is not completed/cancelled
    const isEditable =
        isLeader &&
        meeting.status !== "completed" &&
        meeting.status !== "cancelled";

    return (
        <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* ============================================
                Pane 1: Main Content (Agenda)
                - flex-1: Grows to fill available space
                - min-w-0: Prevents flex item from overflowing
                - flex flex-col: Stack header + scrollable body
                - overflow-hidden: Contain internal scrolling
            ============================================ */}
            <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-background">
                {/* ----------------------------------------
                    Header Container (Pinned)
                    - shrink-0: Never shrinks, always visible
                    - bg-background: Solid background
                    - border-b: Visual separation
                    - z-10: Stays above scrolling content
                ---------------------------------------- */}
                <div className="shrink-0 bg-background border-b border-border z-10">
                    <div className="max-w-3xl mx-auto px-6 lg:px-8 py-6">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
                                {meeting.title}
                            </h1>
                            <MeetingStatusBadge status={meeting.status} />
                        </div>
                        <p className="text-muted-foreground flex items-center gap-2">
                            <CalendarDays className="w-4 h-4" />
                            {formatMeetingDateTime(meeting.scheduled_date)}
                        </p>
                    </div>
                </div>

                {/* ----------------------------------------
                    Scrollable Body (Reactive)
                    - flex-1: Expands/contracts with viewport
                    - min-h-0: Critical for nested flex scrolling
                    - overflow-y-auto: Independent internal scrolling
                ---------------------------------------- */}
                <div className="flex-1 min-h-0 overflow-y-auto">
                    <div className="max-w-3xl mx-auto px-6 lg:px-8 py-6">
                        {/* Agenda Section */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-semibold">Agenda</h2>
                                <div className="text-sm text-muted-foreground flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    <span>Total Est: {totalDuration} min</span>
                                </div>
                            </div>

                            <EditableAgendaItemList
                                items={agendaItems}
                                meetingId={meeting.id}
                                isEditable={isEditable}
                                onItemsChange={setAgendaItems}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* ============================================
                Pane 2: Inspector Panel (Right Sidebar)
                - Fixed width (350-400px responsive)
                - shrink-0: Maintains width, never shrinks
                - flex flex-col: Enable internal flex layout
                - overflow-hidden: Contain internal scrolling
            ============================================ */}
            <div className="w-[350px] lg:w-[400px] shrink-0 flex flex-col overflow-hidden">
                <MeetingContextPanel
                    meeting={meeting}
                    agendaItems={agendaItems}
                    workspaceSlug={workspaceSlug}
                    isLeader={isLeader}
                    totalDuration={totalDuration}
                />
            </div>
        </div>
    );
}
