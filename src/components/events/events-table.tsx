"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    ArrowUp,
    ArrowDown,
    ArrowUpDown,
    CalendarDays,
    Check,
    Minus,
    Pencil,
    Trash2,
    MapPin,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export interface Event {
    id: string;
    title: string;
    description?: string | null;
    location?: string | null;
    start_at: string;
    end_at: string;
    is_all_day: boolean;
    workspace_event_id?: string | null;
    created_at: string;
    announcements?: Array<{
        id: string;
        title: string;
        status: string;
    }> | null;
}

interface EventsTableProps {
    events: Event[];
    sortConfig?: { key: string; direction: 'asc' | 'desc' } | null;
    onSort?: (key: string) => void;
    onEdit?: (event: Event) => void;
    onDelete?: (event: Event) => void;
}

function formatEventDateTime(startAt: string, isAllDay: boolean): string {
    const date = new Date(startAt);
    const dateStr = format(date, "MMM d");

    if (isAllDay) {
        return `${dateStr} • All Day`;
    }

    const timeStr = format(date, "h:mm a");
    return `${dateStr} • ${timeStr}`;
}

function getPromotedStatus(announcements: Event['announcements']): 'announced' | 'not_announced' {
    if (announcements && announcements.length > 0) {
        return 'announced';
    }
    return 'not_announced';
}

export function EventsTable({ events, sortConfig, onSort, onEdit, onDelete }: EventsTableProps) {
    const SortHeader = ({ column, label, className }: { column: string; label: string; className?: string }) => (
        <TableHead
            className={cn("cursor-pointer bg-white hover:bg-gray-50 transition-colors", className)}
            onClick={() => onSort?.(column)}
        >
            <div className="flex items-center space-x-1">
                <span>{label}</span>
                {sortConfig?.key === column ? (
                    sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                ) : (
                    <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                )}
            </div>
        </TableHead>
    );

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow className="group">
                        <SortHeader column="start_at" label="Date/Time" className="w-[180px]" />
                        <SortHeader column="title" label="Event Name" className="w-[300px]" />
                        <SortHeader column="location" label="Location" />
                        <TableHead className="w-[120px]">Promoted</TableHead>
                        <TableHead className="text-right w-[120px]">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {events.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                                <div className="flex flex-col items-center justify-center py-4">
                                    <CalendarDays className="h-8 w-8 text-muted-foreground mb-2" />
                                    <p className="text-muted-foreground">No events found.</p>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : (
                        events.map((event) => {
                            const promotedStatus = getPromotedStatus(event.announcements);

                            return (
                                <TableRow
                                    key={event.id}
                                    className="group hover:bg-muted/50 cursor-pointer"
                                    onClick={() => onEdit?.(event)}
                                >
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <CalendarDays className="h-4 w-4 text-muted-foreground" />
                                            <span>{formatEventDateTime(event.start_at, event.is_all_day)}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-semibold">{event.title}</span>
                                            {event.workspace_event_id && (
                                                <span className="text-xs text-muted-foreground font-mono">
                                                    {event.workspace_event_id}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {event.location ? (
                                            <div className="flex items-center gap-1.5 text-muted-foreground">
                                                <MapPin className="h-3.5 w-3.5" />
                                                <span>{event.location}</span>
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground">—</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {promotedStatus === 'announced' ? (
                                            <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                                                <Check className="h-3 w-3 mr-1" />
                                                Announced
                                            </Badge>
                                        ) : (
                                            <Badge variant="secondary">
                                                <Minus className="h-3 w-3 mr-1" />
                                                Not Announced
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onEdit?.(event);
                                                }}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-destructive hover:text-destructive"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDelete?.(event);
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
