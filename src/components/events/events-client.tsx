"use client";

import { useState, useMemo, useCallback, useTransition, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Search } from "lucide-react";
import { EventsTable, Event } from "./events-table";
import { EventDialog } from "./event-dialog";
import { toast } from "@/lib/toast";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

interface EventsClientProps {
    events: Event[];
    totalCount: number;
    currentSearch: string;
}

export function EventsClient({ events: initialEvents, totalCount, currentSearch }: EventsClientProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const [events, setEvents] = useState<Event[]>(initialEvents);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({
        key: 'start_at',
        direction: 'desc',
    });

    // Dialog states
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [eventToDelete, setEventToDelete] = useState<Event | null>(null);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, []);

    // Debounced search - updates URL params for server-side filtering
    const handleSearchChange = useCallback((value: string) => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        searchTimeoutRef.current = setTimeout(() => {
            startTransition(() => {
                const params = new URLSearchParams(searchParams.toString());
                if (value) {
                    params.set("search", value);
                } else {
                    params.delete("search");
                }
                // Reset to page 1 when searching
                params.delete("page");
                router.push(`${pathname}?${params.toString()}`);
            });
        }, 300);
    }, [router, pathname, searchParams]);

    // Sort events (client-side sorting within the current page)
    const sortedEvents = useMemo(() => {
        let result = events;

        // Sort
        if (sortConfig) {
            result = [...result].sort((a, b) => {
                const { key, direction } = sortConfig;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                let aValue: any = a[key as keyof Event];
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                let bValue: any = b[key as keyof Event];

                if (aValue === null || aValue === undefined) return 1;
                if (bValue === null || bValue === undefined) return -1;

                // Handle date sorting
                if (key === 'start_at' || key === 'end_at') {
                    aValue = new Date(aValue).getTime();
                    bValue = new Date(bValue).getTime();
                }

                if (aValue < bValue) return direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return result;
    }, [events, sortConfig]);

    // Handlers
    const handleCreateNew = () => {
        setSelectedEvent(null);
        setIsDialogOpen(true);
    };

    const handleEdit = (event: Event) => {
        setSelectedEvent(event);
        setIsDialogOpen(true);
    };

    const handleDelete = (event: Event) => {
        setEventToDelete(event);
    };

    const confirmDelete = async () => {
        if (!eventToDelete) return;

        try {
            const response = await fetch(`/api/events/${eventToDelete.id}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to delete event");
            }

            setEvents((prev) => prev.filter((e) => e.id !== eventToDelete.id));

            toast.success("Event Deleted", { description: "The event has been successfully deleted." });
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to delete event.");
        } finally {
            setEventToDelete(null);
        }
    };

    const handleSave = (event: Event, isNew: boolean) => {
        if (isNew) {
            setEvents((prev) => [event, ...prev]);
        } else {
            setEvents((prev) =>
                prev.map((e) => (e.id === event.id ? event : e))
            );
        }
        // Refresh to get updated data with announcements
        router.refresh();
    };

    const handleSort = (key: string) => {
        setSortConfig((current) => {
            if (current?.key === key) {
                if (current.direction === 'asc') return { key, direction: 'desc' };
                return null;
            }
            return { key, direction: 'asc' };
        });
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Events</h1>
                    <p className="text-muted-foreground mt-2">
                        Manage calendar events for your workspace
                    </p>
                </div>
                <Button onClick={handleCreateNew}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Event
                </Button>
            </div>

            <Separator />

            {/* Search */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search events..."
                        defaultValue={currentSearch}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <div className="text-sm text-muted-foreground">
                    {totalCount} event{totalCount !== 1 ? 's' : ''}
                    {isPending && " (loading...)"}
                </div>
            </div>

            {/* Table */}
            <div className="mt-6">
                <EventsTable
                    events={sortedEvents}
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />
            </div>

            {/* Event Dialog */}
            <EventDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                event={selectedEvent}
                onSave={handleSave}
            />

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!eventToDelete} onOpenChange={() => setEventToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Event</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete &quot;{eventToDelete?.title}&quot;?
                            This action cannot be undone.
                            {eventToDelete?.announcements && eventToDelete.announcements.length > 0 && (
                                <span className="block mt-2 text-yellow-600">
                                    Note: The linked announcement will not be deleted but will no longer be associated with this event.
                                </span>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
