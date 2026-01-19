"use client";

import { useState, useMemo } from "react";
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
import { useToast } from "@/lib/hooks/use-toast";
import { useRouter } from "next/navigation";

interface EventsClientProps {
    events: Event[];
}

export function EventsClient({ events: initialEvents }: EventsClientProps) {
    const router = useRouter();
    const { toast } = useToast();

    const [events, setEvents] = useState<Event[]>(initialEvents);
    const [searchQuery, setSearchQuery] = useState("");
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({
        key: 'start_at',
        direction: 'desc',
    });

    // Dialog states
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [eventToDelete, setEventToDelete] = useState<Event | null>(null);

    // Filter and sort events
    const filteredEvents = useMemo(() => {
        let result = events;

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter((event) =>
                event.title.toLowerCase().includes(query) ||
                event.description?.toLowerCase().includes(query) ||
                event.location?.toLowerCase().includes(query) ||
                event.workspace_event_id?.toLowerCase().includes(query)
            );
        }

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
    }, [events, searchQuery, sortConfig]);

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

            toast({
                title: "Event Deleted",
                description: "The event has been successfully deleted.",
            });
        } catch (error) {
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to delete event.",
                variant: "destructive",
            });
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
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <div className="text-sm text-muted-foreground">
                    {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
                </div>
            </div>

            {/* Table */}
            <div className="mt-6">
                <EventsTable
                    events={filteredEvents}
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
