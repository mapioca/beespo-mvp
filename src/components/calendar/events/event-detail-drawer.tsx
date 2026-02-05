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
} from "lucide-react"
import Link from "next/link"
import { DesignInvitationModal } from "@/components/canva/design-invitation-modal"
import { useIsCanvaConnected } from "@/stores/apps-store"
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import type { EventListItem } from "./events-list-client"

interface EventDetailDrawerProps {
    event: EventListItem | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function EventDetailDrawer({
    event,
    open,
    onOpenChange,
}: EventDetailDrawerProps) {
    const [showDesignModal, setShowDesignModal] = useState(false)
    const isCanvaConnected = useIsCanvaConnected()

    // Close design modal when drawer closes
    useEffect(() => {
        if (!open) {
            setShowDesignModal(false)
        }
    }, [open])

    if (!event) return null

    const startDate = parseISO(event.start_at)
    const endDate = parseISO(event.end_at)
    const isMeeting = event.source_type === "meeting"

    // Prepare event data for the design modal
    const eventData = {
        date: format(startDate, "EEEE, MMMM d, yyyy"),
        time: event.is_all_day
            ? "All day"
            : `${format(startDate, "h:mm a")} - ${format(endDate, "h:mm a")}`,
        location: event.location || null,
        description: event.description || null,
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                <SheetHeader className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                        <SheetTitle className="text-xl font-semibold leading-tight">
                            {event.title}
                        </SheetTitle>
                        <Badge
                            variant="outline"
                            className={
                                isMeeting
                                    ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300"
                                    : "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300"
                            }
                        >
                            {isMeeting ? "Meeting" : "Event"}
                        </Badge>
                    </div>
                    <SheetDescription className="sr-only">
                        Event details for {event.title}
                    </SheetDescription>
                </SheetHeader>

                <div className="mt-6 space-y-6">
                    {/* Date and Time */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted">
                                <Calendar className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div>
                                <p className="font-medium">
                                    {format(startDate, "EEEE, MMMM d, yyyy")}
                                </p>
                                {!event.is_all_day ? (
                                    <p className="text-sm text-muted-foreground">
                                        {format(startDate, "h:mm a")} - {format(endDate, "h:mm a")}
                                    </p>
                                ) : (
                                    <p className="text-sm text-muted-foreground">All day</p>
                                )}
                            </div>
                        </div>

                        {event.location && (
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted">
                                    <MapPin className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <div>
                                    <p className="font-medium">Location</p>
                                    <p className="text-sm text-muted-foreground">{event.location}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Description */}
                    {event.description && (
                        <>
                            <Separator />
                            <div className="space-y-2">
                                <h4 className="text-sm font-medium text-muted-foreground">
                                    Description
                                </h4>
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                    {event.description}
                                </p>
                            </div>
                        </>
                    )}

                    {/* Meeting Link */}
                    {isMeeting && event.source_id && (
                        <>
                            <Separator />
                            <div className="space-y-3">
                                <h4 className="text-sm font-medium text-muted-foreground">
                                    Meeting Hub
                                </h4>
                                <Button asChild variant="outline" className="w-full gap-2">
                                    <Link href={`/meetings/${event.source_id}`}>
                                        <CalendarDays className="h-4 w-4" />
                                        Open in Meeting Hub
                                        <ExternalLink className="h-4 w-4 ml-auto" />
                                    </Link>
                                </Button>
                                <p className="text-xs text-muted-foreground text-center">
                                    View agenda, conduct meeting, and manage details
                                </p>
                            </div>
                        </>
                    )}

                    {/* Create Invitation - Only for standalone events */}
                    {!isMeeting && (
                        <>
                            <Separator />
                            <div className="space-y-3">
                                <h4 className="text-sm font-medium text-muted-foreground">
                                    Design Tools
                                </h4>
                                <TooltipProvider>
                                    {isCanvaConnected ? (
                                        <Button
                                            variant="outline"
                                            className="w-full gap-2"
                                            onClick={() => setShowDesignModal(true)}
                                        >
                                            <Palette className="h-4 w-4" />
                                            Create Invitation
                                        </Button>
                                    ) : (
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <span className="block w-full">
                                                    <Button
                                                        variant="outline"
                                                        className="w-full gap-2"
                                                        disabled
                                                    >
                                                        <Palette className="h-4 w-4" />
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

                    {/* Close Button */}
                    <Separator />
                    <Button
                        variant="secondary"
                        className="w-full"
                        onClick={() => onOpenChange(false)}
                    >
                        Close
                    </Button>
                </div>
            </SheetContent>

            {/* Design Invitation Modal */}
            <DesignInvitationModal
                eventId={event.id}
                eventTitle={event.title}
                eventData={eventData}
                isOpen={showDesignModal}
                onClose={() => setShowDesignModal(false)}
            />
        </Sheet>
    )
}
