"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import {
    ArrowRight,
    CalendarDays,
    Link2,
    Loader2,
    MessageSquareText,
    Sparkles,
    Unlink2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/lib/toast";

type MeetingStatus = "draft" | "scheduled" | "in_progress" | "completed" | "cancelled" | null;
type PlanType = "agenda" | "program" | null;

interface LinkedEventSummary {
    id: string;
    title: string;
    start_at: string;
    location: string | null;
    workspace_event_id?: string | null;
}

interface EventCandidate extends LinkedEventSummary {
    meetings?: Array<{ id: string }> | null;
}

interface MeetingLinkageStripProps {
    meetingId?: string;
    meetingTitle: string;
    meetingStatus: MeetingStatus;
    planType: PlanType;
    linkedEvent: LinkedEventSummary | null;
    canManage: boolean;
    onMeetingMetaChange: (updates: {
        planType?: PlanType;
        linkedEvent?: LinkedEventSummary | null;
    }) => void;
}

export function MeetingLinkageStrip({
    meetingId,
    meetingTitle,
    meetingStatus,
    planType,
    linkedEvent,
    canManage,
    onMeetingMetaChange,
}: MeetingLinkageStripProps) {
    const [eventDialogOpen, setEventDialogOpen] = useState(false);
    const [eventCandidates, setEventCandidates] = useState<EventCandidate[]>([]);
    const [isLoadingEvents, setIsLoadingEvents] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!eventDialogOpen || !meetingId) return;

        const fetchEvents = async () => {
            setIsLoadingEvents(true);
            try {
                const response = await fetch("/api/events");
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.error || "Failed to load events");
                }

                const candidates = ((data.events ?? []) as EventCandidate[]).filter((event) => {
                    const linkedMeetingId = event.meetings?.[0]?.id ?? null;
                    return linkedMeetingId === null || linkedMeetingId === meetingId;
                });

                setEventCandidates(candidates);
            } catch (error) {
                toast.error(error instanceof Error ? error.message : "Failed to load events.");
            } finally {
                setIsLoadingEvents(false);
            }
        };

        void fetchEvents();
    }, [eventDialogOpen, meetingId]);

    const formattedLinkedEventDate = useMemo(() => {
        if (!linkedEvent?.start_at) return null;
        return format(parseISO(linkedEvent.start_at), "MMM d, yyyy • h:mm a");
    }, [linkedEvent]);

    const handleLinkEvent = async (eventId: string) => {
        if (!meetingId) return;
        setIsSubmitting(true);
        try {
            const response = await fetch(`/api/meetings/${meetingId}/event`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ event_id: eventId }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || "Failed to link event");
            }

            toast.success(linkedEvent ? "Event link updated" : "Event linked");
            onMeetingMetaChange({
                linkedEvent: {
                    id: data.event.id,
                    title: data.event.title,
                    start_at: data.event.start_at,
                    location: data.event.location ?? null,
                    workspace_event_id: data.event.workspace_event_id ?? null,
                },
            });
            setEventDialogOpen(false);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to link event.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDetachEvent = async () => {
        if (!meetingId) return;
        setIsSubmitting(true);
        try {
            const response = await fetch(`/api/meetings/${meetingId}/event`, { method: "DELETE" });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || "Failed to detach event");
            }

            toast.success("Event detached");
            onMeetingMetaChange({ linkedEvent: null });
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to detach event.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAttachPlan = async (type: Exclude<PlanType, null>) => {
        if (!meetingId) return;
        setIsSubmitting(true);
        try {
            const body =
                type === "program"
                    ? { type, title: meetingTitle || "Untitled Program", segments: [], style_config: {} }
                    : { type, title: meetingTitle || "Untitled Agenda", objectives: [], discussion_items: [] };

            const response = await fetch(`/api/meetings/${meetingId}/plan`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `Failed to add ${type}`);
            }

            toast.success(type === "program" ? "Program added" : "Agenda added");
            onMeetingMetaChange({ planType: type });
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to attach plan.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!meetingId) {
        return (
            <div className="border-t border-border/60 px-4 py-3">
                <p className="text-xs text-muted-foreground">
                    Save this meeting first to manage event and plan links.
                </p>
            </div>
        );
    }

    return (
        <>
            <div className="grid gap-3 border-t border-border/60 px-4 py-3 md:grid-cols-2">
                <div className="rounded-xl border border-border/60 bg-background/60 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Event layer</p>
                            <p className="mt-1 text-sm font-medium">
                                {linkedEvent ? linkedEvent.title : "No event linked yet"}
                            </p>
                        </div>
                        <Badge variant="outline">{linkedEvent ? "Linked" : "Optional"}</Badge>
                    </div>

                    {linkedEvent ? (
                        <>
                            <p className="text-xs text-muted-foreground">
                                {formattedLinkedEventDate}
                                {linkedEvent.location ? ` • ${linkedEvent.location}` : ""}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <Button asChild variant="outline" size="sm" className="gap-2">
                                    <Link href="/calendar/events">
                                        <CalendarDays className="h-4 w-4" />
                                        Open events
                                    </Link>
                                </Button>
                                {canManage && (
                                    <Button variant="outline" size="sm" className="gap-2" onClick={() => setEventDialogOpen(true)}>
                                        <Link2 className="h-4 w-4" />
                                        Replace linked event
                                    </Button>
                                )}
                                {canManage && (
                                    <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={handleDetachEvent} disabled={isSubmitting}>
                                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlink2 className="h-4 w-4" />}
                                        Detach event
                                    </Button>
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            <p className="text-xs text-muted-foreground">
                                Link this meeting to an event when schedule context matters.
                            </p>
                            {canManage ? (
                                <Button variant="outline" size="sm" className="mt-3 gap-2" onClick={() => setEventDialogOpen(true)}>
                                    <Link2 className="h-4 w-4" />
                                    Link to event
                                </Button>
                            ) : (
                                <p className="mt-3 text-xs text-muted-foreground">
                                    A workspace leader can link this meeting to an event.
                                </p>
                            )}
                        </>
                    )}
                </div>

                <div className="rounded-xl border border-border/60 bg-background/60 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Plan layer</p>
                            <p className="mt-1 text-sm font-medium">
                                {planType === "program"
                                    ? "Program attached"
                                    : planType === "agenda"
                                      ? "Agenda attached"
                                      : "No plan attached yet"}
                            </p>
                        </div>
                        <Badge variant="outline" className="capitalize">
                            {planType ?? "None"}
                        </Badge>
                    </div>

                    {planType === "program" ? (
                        <>
                            <p className="text-xs text-muted-foreground">
                                Programs are conductible. Use the program to run the live sequence of the meeting.
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                {meetingStatus === "in_progress" ? (
                                    <Button asChild size="sm" className="gap-2">
                                        <Link href={`/meetings/${meetingId}/conduct`}>
                                            <Sparkles className="h-4 w-4" />
                                            Conduct program
                                        </Link>
                                    </Button>
                                ) : (
                                    <p className="text-xs text-muted-foreground">
                                        Start the meeting before conducting the program.
                                    </p>
                                )}
                            </div>
                        </>
                    ) : planType === "agenda" ? (
                        <>
                            <p className="text-xs text-muted-foreground">
                                Agendas are collaborative planning surfaces. Conduct is not available for agendas.
                            </p>
                            <Button variant="outline" size="sm" className="mt-3 gap-2" disabled>
                                <MessageSquareText className="h-4 w-4" />
                                Collaboration mode
                            </Button>
                            <p className="mt-2 text-xs text-muted-foreground">
                                Comments and discussion notes will live here.
                            </p>
                        </>
                    ) : (
                        <>
                            <p className="text-xs text-muted-foreground">
                                Add a program to conduct this meeting, or add an agenda for collaborative planning.
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <Button variant="outline" size="sm" className="gap-2" onClick={() => handleAttachPlan("agenda")} disabled={isSubmitting || !canManage}>
                                    Add agenda
                                </Button>
                                <Button variant="outline" size="sm" className="gap-2" onClick={() => handleAttachPlan("program")} disabled={isSubmitting || !canManage}>
                                    Add program
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <Dialog open={eventDialogOpen} onOpenChange={(open) => !isSubmitting && setEventDialogOpen(open)}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>{linkedEvent ? "Replace linked event" : "Link to event"}</DialogTitle>
                        <DialogDescription>
                            Choose an event that is not already linked to another meeting.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="max-h-[320px] space-y-2 overflow-y-auto">
                        {isLoadingEvents ? (
                            <div className="flex items-center gap-2 rounded-lg border border-border/60 p-4 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading events...
                            </div>
                        ) : eventCandidates.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
                                No eligible events found. Create an event first or detach an existing link.
                            </div>
                        ) : (
                            eventCandidates.map((event) => {
                                const linkedToCurrentMeeting = event.meetings?.[0]?.id === meetingId;
                                return (
                                    <button
                                        key={event.id}
                                        type="button"
                                        onClick={() => handleLinkEvent(event.id)}
                                        disabled={isSubmitting}
                                        className="flex w-full items-start justify-between rounded-lg border border-border/60 p-3 text-left transition-colors hover:bg-accent/40 disabled:opacity-60"
                                    >
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium">{event.title}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {format(parseISO(event.start_at), "MMM d, yyyy • h:mm a")}
                                                {event.location ? ` • ${event.location}` : ""}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {linkedToCurrentMeeting && <Badge variant="outline">Current</Badge>}
                                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEventDialogOpen(false)} disabled={isSubmitting}>
                            Cancel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
