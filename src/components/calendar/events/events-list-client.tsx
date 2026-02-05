"use client"

import { useState } from "react"
import { format, parseISO, isPast, isFuture, isToday } from "date-fns"
import { useRouter } from "next/navigation"
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
} from "lucide-react"
import { cn } from "@/lib/utils"
import { EventDetailDrawer } from "./event-detail-drawer"

export interface EventListItem {
    id: string
    title: string
    description: string | null
    location: string | null
    start_at: string
    end_at: string
    is_all_day: boolean
    workspace_event_id: string | null
    external_source_id: string | null
    external_source_type: string | null
    source_type: "event" | "meeting" | "announcement" | "task"
    source_id?: string
}

interface EventsListClientProps {
    events: EventListItem[]
}

function getEventStatus(startAt: string, endAt: string): "upcoming" | "ongoing" | "past" {
    const start = parseISO(startAt)
    const end = parseISO(endAt)

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

function getSourceBadge(sourceType: string) {
    const isMeeting = sourceType === "meeting"

    if (isMeeting) {
        return (
            <Badge
                variant="outline"
                className="bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-700 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900 gap-1"
            >
                <CalendarDays className="h-3 w-3" />
                Meeting
                <ExternalLink className="h-3 w-3" />
            </Badge>
        )
    }

    switch (sourceType) {
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

export function EventsListClient({ events }: EventsListClientProps) {
    const router = useRouter()
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedEvent, setSelectedEvent] = useState<EventListItem | null>(null)
    const [drawerOpen, setDrawerOpen] = useState(false)

    // Filter events by search query
    const filteredEvents = events.filter((event) => {
        if (!searchQuery) return true
        const query = searchQuery.toLowerCase()
        return (
            event.title.toLowerCase().includes(query) ||
            event.location?.toLowerCase().includes(query) ||
            event.description?.toLowerCase().includes(query)
        )
    })

    // Sort events: upcoming first, then ongoing, then past
    const sortedEvents = [...filteredEvents].sort((a, b) => {
        const statusA = getEventStatus(a.start_at, a.end_at)
        const statusB = getEventStatus(b.start_at, b.end_at)
        const statusOrder = { ongoing: 0, upcoming: 1, past: 2 }

        if (statusOrder[statusA] !== statusOrder[statusB]) {
            return statusOrder[statusA] - statusOrder[statusB]
        }

        // Within same status, sort by start date
        return new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
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
        if (event.source_id) {
            router.push(`/meetings/${event.source_id}`)
        }
    }

    return (
        <div className="p-6 space-y-6">
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
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[300px]">Event</TableHead>
                                <TableHead>Date & Time</TableHead>
                                <TableHead>Location</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedEvents.map((event) => {
                                const status = getEventStatus(event.start_at, event.end_at)
                                const startDate = parseISO(event.start_at)
                                const isMeeting = event.source_type === "meeting"

                                return (
                                    <TableRow
                                        key={`${event.source_type}-${event.id}`}
                                        className={cn(
                                            "cursor-pointer hover:bg-muted/50",
                                            status === "past" && "opacity-60"
                                        )}
                                        onClick={() => handleEventClick(event)}
                                    >
                                        <TableCell className="font-medium">
                                            <div className="flex flex-col gap-1">
                                                <span className="line-clamp-1">{event.title}</span>
                                                {event.description && (
                                                    <span className="text-xs text-muted-foreground line-clamp-1">
                                                        {event.description}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-0.5">
                                                <div className="flex items-center gap-1.5 text-sm">
                                                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                                    {format(startDate, "MMM d, yyyy")}
                                                    {isToday(startDate) && (
                                                        <Badge variant="secondary" className="text-xs py-0">
                                                            Today
                                                        </Badge>
                                                    )}
                                                </div>
                                                {!event.is_all_day && (
                                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                        <Clock className="h-3 w-3" />
                                                        {format(startDate, "h:mm a")}
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
                                                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                                                    <span className="line-clamp-1">{event.location}</span>
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {isMeeting ? (
                                                <div onClick={(e) => handleMeetingLinkClick(e, event)}>
                                                    {getSourceBadge(event.source_type)}
                                                </div>
                                            ) : (
                                                getSourceBadge(event.source_type)
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
            />
        </div>
    )
}
