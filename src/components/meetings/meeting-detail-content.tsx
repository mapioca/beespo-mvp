"use client";

import {useState} from "react";
import {CalendarDays, Clock, Pencil, Printer} from "lucide-react";
import Link from "next/link";
import {Button} from "@/components/ui/button";
import {MeetingStatusBadge} from "@/components/meetings/meeting-status-badge";
import {MarkdownRenderer} from "@/components/meetings/markdown-renderer";
import {formatMeetingDateTime} from "@/lib/meeting-helpers";
import {calculateTotalDurationWithGrouping} from "@/lib/agenda-grouping";
import {ShareDialog} from "@/components/conduct/share-dialog";
import {Database} from "@/types/database";

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
    currentUserName: string;
}

export function MeetingDetailContent({
    meeting,
    agendaItems: initialAgendaItems,
    workspaceSlug,
    isLeader,
     }: MeetingDetailContentProps) {
    const [currentMeeting, setCurrentMeeting] = useState(meeting);
    // Recalculate total duration using grouped logic (time-boxing)
    // Groups use their fixed duration, not sum of children
    const totalDuration = calculateTotalDurationWithGrouping(initialAgendaItems);

    const handleMeetingUpdate = (updatedMeeting: Meeting) => {
        setCurrentMeeting(updatedMeeting);
    };

    return (
        <div className="flex flex-1 min-h-0 overflow-hidden bg-muted/30">
            {/* Main Content (Agenda) */}
            <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
                {/* Header Container (Pinned) */}
                <div className="shrink-0 bg-background border-b border-border z-10 shadow-sm">
                    <div className="max-w-5xl mx-auto px-6 lg:px-8 py-6">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-3 mb-2 flex-wrap">
                                    <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
                                        {currentMeeting.title}
                                    </h1>
                                    <MeetingStatusBadge status={currentMeeting.status} />
                                </div>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                    {currentMeeting.templates?.name && (
                                        <span>{currentMeeting.templates.name}</span>
                                    )}
                                    {currentMeeting.templates?.name && currentMeeting.profiles?.full_name && (
                                        <span aria-hidden="true">·</span>
                                    )}
                                    {currentMeeting.profiles?.full_name && (
                                        <span>{currentMeeting.profiles.full_name}</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-6 mt-2 text-sm text-muted-foreground font-medium">
                                    <span className="flex items-center gap-2">
                                        <CalendarDays className="w-4 h-4" />
                                        {formatMeetingDateTime(currentMeeting.scheduled_date)}
                                    </span>
                                    <span className="flex items-center gap-2">
                                        <Clock className="w-4 h-4" />
                                        Total Est: {totalDuration} min
                                    </span>
                                </div>
                            </div>

                            {/* Actions Toolbar */}
                            <div className="flex items-center gap-2 shrink-0">
                                {isLeader && (
                                    <Button asChild variant="outline" size="sm" className="hidden sm:flex">
                                        <Link href={`/meetings/${currentMeeting.id}/builder`}>
                                            <Pencil className="w-4 h-4 mr-2" />
                                            Edit Agenda
                                        </Link>
                                    </Button>
                                )}

                                <ShareDialog
                                    meeting={currentMeeting}
                                    workspaceSlug={workspaceSlug}
                                    onUpdate={handleMeetingUpdate}
                                />

                                <Button asChild variant="outline" size="sm">
                                    <a href={`/meetings/${currentMeeting.id}/print`} target="_blank" rel="noopener noreferrer">
                                        <Printer className="w-4 h-4 mr-2" />
                                        Print
                                    </a>
                                </Button>

                                {/* Mobile fallback for edit */}
                                {isLeader && (
                                    <Button asChild variant="outline" size="icon" className="sm:hidden">
                                        <Link href={`/meetings/${currentMeeting.id}/builder`} title="Edit Agenda">
                                            <Pencil className="w-4 h-4" />
                                        </Link>
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Scrollable Body (Reactive) */}
                <div className="flex-1 min-h-0 overflow-y-auto w-full p-4 sm:p-6 lg:p-8">
                    <div className="max-w-[850px] mx-auto w-full">
                        {currentMeeting.markdown_agenda ? (
                            <div className="bg-background border rounded-none sm:rounded-lg shadow-sm w-full min-h-[1056px] p-8 sm:p-12 lg:p-16 relative">
                                <MarkdownRenderer markdown={currentMeeting.markdown_agenda} />
                            </div>
                        ) : (
                            <div className="p-8 text-center text-muted-foreground border rounded-lg bg-background shadow-sm">
                                <p>No agenda available for this meeting.</p>
                                {isLeader && (
                                    <Button asChild variant="outline" className="mt-4">
                                        <Link href={`/meetings/${currentMeeting.id}/builder`}>
                                            Create Agenda
                                        </Link>
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
