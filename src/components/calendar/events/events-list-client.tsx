"use client"

import { useEffect, useState } from "react"
import { format, parseISO, isPast, isFuture, isToday } from "date-fns"
import { useRouter, useSearchParams } from "next/navigation"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
    Calendar,
    Clock,
    MapPin,
    Search,
    CalendarDays,
    ExternalLink,
    Plus,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { parseAllDayDate } from "@/lib/calendar-helpers"
import { richTextToPlainText } from "@/lib/rich-text"
import { EventDetailDrawer } from "./event-detail-drawer"
import { Button } from "@/components/ui/button"
import { CreateEventDialog, type CalendarEventData } from "@/components/calendar/create-event-dialog"

export interface EventListItem {
    id: string
    title: string
    event_type?: "interview" | "meeting" | "activity"
    description: string | null
    location: string | null
    start_at: string
    end_at: string
    is_all_day: boolean
    date_tbd?: boolean
    time_tbd?: boolean
    duration_mode?: "minutes" | "tbd" | "all_day"
    duration_minutes?: number | null
    workspace_event_id: string | null
    external_source_id: string | null
    external_source_type: string | null
    source_type: "event" | "meeting" | "announcement" | "task"
    source_id?: string
    linkedMeeting?: {
        id: string
        title: string
        status: string
        plan_type: "agenda" | "program" | null
    } | null
}

interface EventsListClientProps {
    events: EventListItem[]
    canManageEvents?: boolean
}

function getStartDate(event: EventListItem): Date {
    return event.is_all_day ? parseAllDayDate(event.start_at) : parseISO(event.start_at)
}

function getEndDate(event: EventListItem): Date {
    if (!event.is_all_day) return parseISO(event.end_at)

    const end = parseAllDayDate(event.end_at)
    end.setHours(23, 59, 59, 999)
    return end
}

function getEventStatus(event: EventListItem): "upcoming" | "ongoing" | "past" {
    const start = getStartDate(event)
    const end = getEndDate(event)

    if (isPast(end)) return "past"
    if (isFuture(start)) return "upcoming"
    return "ongoing"
}

function getStatusBadge(status: "upcoming" | "ongoing" | "past") {
    switch (status) {
        case "upcoming":
            return (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                    Upcoming
                </Badge>
            )
        case "ongoing":
            return (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">
                    Ongoing
                </Badge>
            )
        case "past":
            return (
                <Badge variant="secondary" className="text-muted-foreground">
                    Past
                </Badge>
            )
    }
}

function getSourceBadge(event: EventListItem) {
    if (event.linkedMeeting) {
        return (
            <Badge
                variant="outline"
                className="bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-700 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900 gap-1"
            >
                <CalendarDays className="h-3 w-3" />
                {event.linkedMeeting.plan_type === "program" ? "Meeting + Program" : "Meeting"}
                <ExternalLink className="h-3 w-3" />
            </Badge>
        )
    }

    switch (event.source_type) {
        case "event":
            return (
                <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300">
                    Event
                </Badge>
            )
        case "announcement":
            return (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300">
                    Announcement
                </Badge>
            )
        case "task":
            return (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300">
                    Task
                </Badge>
            )
        default:
            return null
    }
}

export function EventsListClient({ events, canManageEvents = false }: EventsListClientProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [searchQuery, setSearchQuery] = useState("")
    const [localEvents, setLocalEvents] = useState(events)
    const [selectedEvent, setSelectedEvent] = useState<EventListItem | null>(null)
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [createDialogOpen, setCreateDialogOpen] = useState(false)

    useEffect(() => {
        setLocalEvents(events)
    }, [events])

    const createdIdsParam = searchParams.get("created")
    const createParam = searchParams.get("create")
    const createdIds = createdIdsParam
        ? createdIdsParam.split(",").map((id) => id.trim()).filter(Boolean)
        : []

    useEffect(() => {
        if (!canManageEvents) return
        if (createParam !== "event") return
        setCreateDialogOpen(true)
    }, [canManageEvents, createParam])

    // Filter events by created session IDs first, then search query
    const filteredEvents = localEvents.filter((event) => {
        if (createdIds.length > 0 && !createdIds.includes(event.id)) return false
        if (!searchQuery) return true
        const query = searchQuery.toLowerCase()
        const descriptionText = event.description ? richTextToPlainText(event.description).toLowerCase() : ""
        return (
            event.title.toLowerCase().includes(query) ||
            event.location?.toLowerCase().includes(query) ||
            descriptionText.includes(query)
        )
    })

    // Sort events: upcoming first, then ongoing, then past
    const sortedEvents = [...filteredEvents].sort((a, b) => {
        const statusA = getEventStatus(a)
        const statusB = getEventStatus(b)
        const statusOrder = { ongoing: 0, upcoming: 1, past: 2 }

        if (statusOrder[statusA] !== statusOrder[statusB]) {
            return statusOrder[statusA] - statusOrder[statusB]
        }

        // Within same status, sort by start date
        return getStartDate(a).getTime() - getStartDate(b).getTime()
    })

    const handleEventClick = (event: EventListItem) => {
        if (event.source_type === "meeting" && event.source_id) {
            router.push(`/meetings/${event.source_id}`)
        } else {
            setSelectedEvent(event)
            setDrawerOpen(true)
        }
    }

    const handleMeetingLinkClick = (e: React.MouseEvent, event: EventListItem) => {
        e.stopPropagation()
        if (event.linkedMeeting?.id) {
            router.push(`/meetings/${event.linkedMeeting.id}`)
        } else if (event.source_id) {
            router.push(`/meetings/${event.source_id}`)
        }
    }

    const handleEventUpdated = (updatedEvent: EventListItem) => {
        setLocalEvents((prev) =>
            prev.map((item) => (item.id === updatedEvent.id ? { ...item, ...updatedEvent } : item))
        )
        setSelectedEvent(updatedEvent)
    }

    const handleEventDeleted = (eventId: string) => {
        setLocalEvents((prev) => prev.filter((item) => item.id !== eventId))
        setSelectedEvent((prev) => (prev?.id === eventId ? null : prev))
        setDrawerOpen(false)
    }

    const mapCalendarEventToListItem = (event: CalendarEventData): EventListItem => ({
        id: event.id,
        title: event.title,
        event_type: event.event_type ?? "activity",
        description: event.description,
        location: event.location,
        start_at: event.start_at,
        end_at: event.end_at,
        is_all_day: event.is_all_day,
        date_tbd: event.date_tbd ?? false,
        time_tbd: event.time_tbd ?? false,
        duration_mode: event.duration_mode ?? (event.is_all_day ? "all_day" : "minutes"),
        duration_minutes: event.duration_minutes ?? null,
        workspace_event_id: event.workspace_event_id,
        external_source_id: event.external_source_id,
        external_source_type: event.external_source_type,
        source_type: "event",
        linkedMeeting: null,
    })

    const handleCreated = (event: CalendarEventData) => {
        const mapped = mapCalendarEventToListItem(event)
        setLocalEvents((prev) => [mapped, ...prev.filter((item) => item.id !== mapped.id)])
    }

    const handleCreateDialogOpenChange = (open: boolean) => {
        setCreateDialogOpen(open)
        if (!open && createParam === "event") {
            const params = new URLSearchParams(searchParams.toString())
            params.delete("create")
            const nextQuery = params.toString()
            router.replace(nextQuery ? `/schedule/events?${nextQuery}` : "/schedule/events")
        }
    }

    return (
        <div className="p-6 space-y-6">
            {createdIds.length > 0 && (
                <div className="flex items-center justify-between gap-3 rounded-md border border-primary/30 bg-primary/5 px-3 py-2">
                    <p className="text-sm text-muted-foreground">
                        Showing only events created in your latest batch.
                    </p>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push("/schedule/events")}
                    >
                        Clear filter
                    </Button>
                </div>
            )}
            {/* Search Bar */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search events..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <div className="text-sm text-muted-foreground">
                    {filteredEvents.length} event{filteredEvents.length !== 1 ? "s" : ""}
                </div>
                {canManageEvents && (
                    <Button
                        size="sm"
                        className="ml-auto"
                        onClick={() => setCreateDialogOpen(true)}
                    >
                        <Plus className="h-4 w-4" />
                        New event
                    </Button>
                )}
            </div>

            {/* Events Table */}
            {sortedEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Calendar className="h-16 w-16 text-muted-foreground/40 mb-4" />
                    <h3 className="text-lg font-medium text-muted-foreground">No events found</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                        {searchQuery
                            ? "Try adjusting your search query"
                            : "Create your first event from the Calendar tab"}
                    </p>
                </div>
            ) : (
                <div className="rounded-md border border-[hsl(var(--chip-border))] bg-background/80">
                    <Table className="text-[13px]">
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[300px] text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Event</TableHead>
                                <TableHead className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Date & Time</TableHead>
                                <TableHead className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Location</TableHead>
                                <TableHead className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Type</TableHead>
                                <TableHead className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedEvents.map((event) => {
                                const status = getEventStatus(event)
                                const startDate = getStartDate(event)
                                const descriptionPreview = event.description
                                    ? richTextToPlainText(event.description)
                                    : ""
                                return (
                                    <TableRow
                                        key={event.id}
                                        className={cn(
                                            "cursor-pointer transition-colors hover:bg-[hsl(var(--table-row-hover))]",
                                            status === "past" && "opacity-60"
                                        )}
                                        onClick={() => handleEventClick(event)}
                                    >
                                        <TableCell className="font-medium text-[13px]">
                                            <div className="flex flex-col gap-1">
                                                <span className="line-clamp-1">{event.title}</span>
                                                {descriptionPreview && (
                                                    <span className="text-[12px] text-muted-foreground line-clamp-1">
                                                        {descriptionPreview}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-0.5">
                                                <div className="flex items-center gap-1.5 text-sm">
                                                    <Calendar className="h-3.5 w-3.5 text-muted-foreground stroke-[1.6]" />
                                                    {event.date_tbd ? "Date TBD" : format(startDate, "MMM d, yyyy")}
                                                    {isToday(startDate) && (
                                                        <Badge variant="secondary" className="text-xs py-0">
                                                            Today
                                                        </Badge>
                                                    )}
                                                </div>
                                                {!event.is_all_day && (
                                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                        <Clock className="h-3 w-3 stroke-[1.6]" />
                                                        {event.time_tbd ? "Time TBD" : format(startDate, "h:mm a")}
                                                    </div>
                                                )}
                                                {event.is_all_day && (
                                                    <span className="text-xs text-muted-foreground">All day</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {event.location ? (
                                                <div className="flex items-center gap-1.5 text-sm">
                                                    <MapPin className="h-3.5 w-3.5 text-muted-foreground stroke-[1.6]" />
                                                    <span className="line-clamp-1">{event.location}</span>
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {event.linkedMeeting || event.source_type === "meeting" ? (
                                                <div onClick={(e) => handleMeetingLinkClick(e, event)}>
                                                    {getSourceBadge(event)}
                                                </div>
                                            ) : (
                                                getSourceBadge(event)
                                            )}
                                        </TableCell>
                                        <TableCell>{getStatusBadge(status)}</TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Event Detail Drawer */}
            <EventDetailDrawer
                event={selectedEvent}
                open={drawerOpen}
                onOpenChange={setDrawerOpen}
                canManageEvents={canManageEvents}
                onEventUpdated={handleEventUpdated}
                onEventDeleted={handleEventDeleted}
            />
            {canManageEvents && (
                <CreateEventDialog
                    open={createDialogOpen}
                    onOpenChange={handleCreateDialogOpenChange}
                    selectedDate={null}
                    onCreated={handleCreated}
                />
            )}
        </div>
    )
}
