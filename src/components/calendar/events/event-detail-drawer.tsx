"use client"

import { useState, useEffect } from "react"
import { format, parseISO } from "date-fns"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { TooltipProvider } from "@/components/ui/tooltip"
import {
    Calendar,
    MapPin,
    ExternalLink,
    CalendarDays,
    Palette,
    Pencil,
    Trash2,
    Loader2,
    ArrowRight,
} from "lucide-react"
import Link from "next/link"
import { DesignInvitationModal } from "@/components/canva/design-invitation-modal"
import { useIsCanvaConnected } from "@/stores/apps-store"
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "@/lib/toast"
import { CreateEventDialog, type CalendarEventData } from "@/components/calendar/create-event-dialog"
import { parseAllDayDate } from "@/lib/calendar-helpers"
import { sanitizeRichTextHtml } from "@/lib/rich-text"
import type { EventListItem } from "./events-list-client"

interface EventDetailDrawerProps {
    event: EventListItem | null
    open: boolean
    onOpenChange: (open: boolean) => void
    canManageEvents?: boolean
    onEventUpdated?: (event: EventListItem) => void
    onEventDeleted?: (eventId: string) => void
}

export function EventDetailDrawer({
    event,
    open,
    onOpenChange,
    canManageEvents = false,
    onEventUpdated,
    onEventDeleted,
}: EventDetailDrawerProps) {
    const [showDesignModal, setShowDesignModal] = useState(false)
    const [showEditDialog, setShowEditDialog] = useState(false)
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [isEnablingMeeting, setIsEnablingMeeting] = useState(false)
    const isCanvaConnected = useIsCanvaConnected()

    useEffect(() => {
        if (!open) {
            setShowDesignModal(false)
            setShowEditDialog(false)
            setShowDeleteDialog(false)
        }
    }, [open])

    if (!event) return null

    const startDate = event.is_all_day ? parseAllDayDate(event.start_at) : parseISO(event.start_at)
    const endDate = event.is_all_day ? parseAllDayDate(event.end_at) : parseISO(event.end_at)
    const isMeeting = event.source_type === "meeting"
    const isStandaloneEvent = event.source_type === "event"
    const linkedMeeting = event.linkedMeeting ?? null

    const eventData = {
        date: event.date_tbd ? "Date TBD" : format(startDate, "EEEE, MMMM d, yyyy"),
        time: event.time_tbd
            ? "Time TBD"
            : event.is_all_day
            ? "All day"
            : `${format(startDate, "h:mm a")} - ${format(endDate, "h:mm a")}`,
        location: event.location || null,
        description: event.description || null,
    }

    const editableEventData: CalendarEventData = {
        id: event.id,
        title: event.title,
        description: event.description,
        location: event.location,
        start_at: event.start_at,
        end_at: event.end_at,
        is_all_day: event.is_all_day,
        event_type: event.event_type,
        date_tbd: event.date_tbd,
        time_tbd: event.time_tbd,
        duration_mode: event.duration_mode,
        duration_minutes: event.duration_minutes,
        workspace_event_id: event.workspace_event_id,
        external_source_id: event.external_source_id,
        external_source_type: event.external_source_type,
    }

    const handleUpdated = (updatedEvent: CalendarEventData) => {
        onEventUpdated?.({
            ...event,
            ...updatedEvent,
            source_type: "event",
        })
        setShowEditDialog(false)
    }

    const handleDelete = async () => {
        setIsDeleting(true)
        try {
            const response = await fetch(`/api/events/${event.id}`, { method: "DELETE" })
            const data = await response.json()
            if (!response.ok) {
                throw new Error(data.error || "Failed to delete event")
            }
            toast.success("Event deleted successfully.")
            onEventDeleted?.(event.id)
            setShowDeleteDialog(false)
            onOpenChange(false)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to delete event.")
        } finally {
            setIsDeleting(false)
        }
    }

    const handleEnableMeetingFeatures = async () => {
        if (!isStandaloneEvent || !canManageEvents) return

        setIsEnablingMeeting(true)
        try {
            const response = await fetch(`/api/events/${event.id}/meeting`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: event.title }),
            })
            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || "Failed to enable meeting features")
            }

            onOpenChange(false)
            window.location.href = `/meetings/${data.meeting.id}?setup=plan&created=meeting`
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to enable meeting features.")
        } finally {
            setIsEnablingMeeting(false)
        }
    }

    return (
        <>
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                    <SheetHeader className="space-y-4">
                        <div className="flex items-start justify-between gap-4">
                            <SheetTitle className="font-serif text-[22px] font-normal leading-tight">
                                {event.title}
                            </SheetTitle>
                            <Badge
                                variant="outline"
                                className="bg-muted/40 text-foreground border border-border/50"
                            >
                                {isMeeting ? "Meeting" : "Event"}
                            </Badge>
                        </div>
                        <SheetDescription className="sr-only">
                            Event details for {event.title}
                        </SheetDescription>
                    </SheetHeader>

                    <div className="mt-6 space-y-6">
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-10 h-10 rounded-lg border border-border/50 bg-muted/35">
                                    <Calendar className="h-5 w-5 text-muted-foreground stroke-[1.6]" />
                                </div>
                                <div>
                                    <p className="font-medium">
                                        {eventData.date}
                                    </p>
                                    {!event.is_all_day ? (
                                        <p className="text-sm text-muted-foreground">
                                            {eventData.time}
                                        </p>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">{eventData.time}</p>
                                    )}
                                </div>
                            </div>

                            {event.location && (
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-10 h-10 rounded-lg border border-border/50 bg-muted/35">
                                        <MapPin className="h-5 w-5 text-muted-foreground stroke-[1.6]" />
                                    </div>
                                    <div>
                                        <p className="font-medium">Location</p>
                                        <p className="text-sm text-muted-foreground">{event.location}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {event.description && (
                            <>
                                <Separator />
                                <div className="space-y-2">
                                    <h4 className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                                        Description
                                    </h4>
                                    <div
                                        className="text-sm leading-relaxed whitespace-pre-wrap [&_p]:my-0 [&_ul]:my-1 [&_ol]:my-1 [&_li]:ml-5 [&_li]:list-item"
                                        dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(event.description) }}
                                    />
                                </div>
                            </>
                        )}

                        {isMeeting && event.source_id && (
                            <>
                                <Separator />
                                <div className="space-y-3">
                                    <h4 className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                                        Meeting Hub
                                    </h4>
                                    <Button asChild variant="outline" className="w-full gap-2 border-border/60 hover:bg-accent shadow-none">
                                        <Link href={`/meetings/${event.source_id}`}>
                                            <CalendarDays className="h-4 w-4 stroke-[1.6]" />
                                            Open in Meeting Hub
                                            <ExternalLink className="h-4 w-4 ml-auto stroke-[1.6]" />
                                        </Link>
                                    </Button>
                                    <p className="text-xs text-muted-foreground text-center">
                                        Manage meeting details and continue from the meeting workspace.
                                    </p>
                                </div>
                            </>
                        )}

                        {isStandaloneEvent && (
                            <>
                                <Separator />
                                <div className="space-y-3">
                                    <h4 className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                                        Meeting Layer
                                    </h4>
                                    {linkedMeeting ? (
                                        <div className="rounded-lg border border-border/60 bg-background/70 p-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="space-y-1">
                                                    <p className="text-sm font-medium">{linkedMeeting.title}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Meeting features are enabled for this event.
                                                    </p>
                                                </div>
                                                <Badge variant="outline" className="capitalize">
                                                    {linkedMeeting.plan_type ?? "No plan"}
                                                </Badge>
                                            </div>
                                            <Button asChild variant="outline" className="mt-3 w-full gap-2 border-border/60 shadow-none">
                                                <Link href={`/meetings/${linkedMeeting.id}`}>
                                                    <CalendarDays className="h-4 w-4 stroke-[1.6]" />
                                                    Open meeting
                                                    <ArrowRight className="ml-auto h-4 w-4 stroke-[1.6]" />
                                                </Link>
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="rounded-lg border border-dashed border-border/70 bg-background/50 p-4">
                                            <p className="text-sm font-medium">No meeting linked yet</p>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                Enable meeting features if this event needs roles, notes, Zoom, and a linked agenda or program.
                                            </p>
                                            {canManageEvents ? (
                                                <Button
                                                    variant="outline"
                                                    className="mt-3 w-full gap-2 border-border/60 shadow-none"
                                                    onClick={handleEnableMeetingFeatures}
                                                    disabled={isEnablingMeeting}
                                                >
                                                    {isEnablingMeeting ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <CalendarDays className="h-4 w-4 stroke-[1.6]" />
                                                    )}
                                                    Enable meeting features
                                                </Button>
                                            ) : (
                                                <p className="mt-3 text-xs text-muted-foreground">
                                                    A workspace leader can enable meeting features for this event.
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {!isMeeting && (
                            <>
                                <Separator />
                                <div className="space-y-3">
                                    <h4 className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                                        Design Tools
                                    </h4>
                                    <TooltipProvider>
                                        {isCanvaConnected ? (
                                            <Button
                                                variant="outline"
                                                className="w-full gap-2 border-border/60 hover:bg-accent shadow-none"
                                                onClick={() => setShowDesignModal(true)}
                                            >
                                                <Palette className="h-4 w-4 stroke-[1.6]" />
                                                Create Invitation
                                            </Button>
                                        ) : (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span className="block w-full">
                                                        <Button
                                                            variant="outline"
                                                            className="w-full gap-2 border-border/60 shadow-none"
                                                            disabled
                                                        >
                                                            <Palette className="h-4 w-4 stroke-[1.6]" />
                                                            Create Invitation
                                                        </Button>
                                                    </span>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>Add Canva from the Apps Hub to enable this feature</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        )}
                                    </TooltipProvider>
                                    <p className="text-xs text-muted-foreground text-center">
                                        {isCanvaConnected
                                            ? "Design an invitation with Canva"
                                            : "Connect Canva in Apps Hub to design invitations"}
                                    </p>
                                </div>
                            </>
                        )}

                        {isStandaloneEvent && canManageEvents && (
                            <>
                                <Separator />
                                <div className="grid grid-cols-2 gap-2">
                                    <Button
                                        variant="outline"
                                        className="gap-2 border-border/60 hover:bg-accent shadow-none"
                                        onClick={() => setShowEditDialog(true)}
                                    >
                                        <Pencil className="h-4 w-4 stroke-[1.6]" />
                                        Edit
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 shadow-none"
                                        onClick={() => setShowDeleteDialog(true)}
                                    >
                                        <Trash2 className="h-4 w-4 stroke-[1.6]" />
                                        Delete
                                    </Button>
                                </div>
                            </>
                        )}

                        <Separator />
                        <Button
                            variant="secondary"
                            className="w-full shadow-none"
                            onClick={() => onOpenChange(false)}
                        >
                            Close
                        </Button>
                    </div>
                </SheetContent>

                <DesignInvitationModal
                    eventId={event.id}
                    eventTitle={event.title}
                    eventData={eventData}
                    isOpen={showDesignModal}
                    onClose={() => setShowDesignModal(false)}
                />
            </Sheet>

            <CreateEventDialog
                open={showEditDialog}
                onOpenChange={setShowEditDialog}
                selectedDate={startDate}
                eventToEdit={editableEventData}
                onUpdated={handleUpdated}
            />

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Event</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete &quot;{event.title}&quot;? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
