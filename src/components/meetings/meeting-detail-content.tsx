"use client";

import { useState } from "react";
import { Separator } from "@/components/ui/separator";
import { CalendarDays, Clock } from "lucide-react";
import { MeetingStatusBadge } from "@/components/meetings/meeting-status-badge";
import { EditableAgendaItemList } from "@/components/meetings/editable";
import { MeetingSidebar } from "@/components/meetings/sidebar";
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
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            {/* Main Content Area */}
            <div className="space-y-6 min-w-0">
                {/* Title Section */}
                <div>
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

                <Separator />

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

            {/* Right Sidebar */}
            <div className="lg:sticky lg:top-6 lg:self-start">
                <MeetingSidebar
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
