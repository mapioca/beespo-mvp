"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Plus } from "lucide-react";
import { MeetingsFilters, MeetingStatus, Template } from "./meetings-filters";
import { MeetingsTable, Meeting } from "./meetings-table";

interface MeetingsClientProps {
    meetings: Meeting[];
    templates: Template[];
    workspaceSlug: string | null;
    isLeader: boolean;
}

export function MeetingsClient({
    meetings: initialMeetings,
    templates,
    workspaceSlug,
    isLeader,
}: MeetingsClientProps) {
    const [meetings, setMeetings] = useState(initialMeetings);
    const [filters, setFilters] = useState<{
        search: string;
        status: MeetingStatus[];
        templateIds: string[];
    }>({
        search: "",
        status: [],
        templateIds: [],
    });
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    const filteredMeetings = useMemo(() => {
        const result = meetings.filter((meeting) => {
            // Search filter
            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                const matchesSearch =
                    meeting.title.toLowerCase().includes(searchLower) ||
                    meeting.workspace_meeting_id?.toLowerCase().includes(searchLower) ||
                    meeting.templates?.name.toLowerCase().includes(searchLower);
                if (!matchesSearch) return false;
            }

            // Status filter
            if (filters.status.length > 0 && !filters.status.includes(meeting.status as MeetingStatus)) {
                return false;
            }

            // Template filter
            if (filters.templateIds.length > 0) {
                const meetingTemplateId = meeting.templates?.id || "no-template";
                const hasNoTemplate = meeting.templates === null;

                if (filters.templateIds.includes("no-template") && hasNoTemplate) {
                    return true;
                }
                if (meeting.templates && filters.templateIds.includes(meeting.templates.id)) {
                    return true;
                }
                // If template filters are active but this meeting doesn't match any
                if (!filters.templateIds.includes(meetingTemplateId)) {
                    return false;
                }
            }

            return true;
        });

        if (sortConfig) {
            result.sort((a, b) => {
                const { key, direction } = sortConfig;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                let aValue: any;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                let bValue: any;

                if (key === 'template') {
                    aValue = a.templates?.name || '';
                    bValue = b.templates?.name || '';
                } else {
                    aValue = a[key as keyof Meeting];
                    bValue = b[key as keyof Meeting];
                }

                // Handle nulls
                if (aValue === null || aValue === undefined) return 1;
                if (bValue === null || bValue === undefined) return -1;

                if (aValue < bValue) return direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return result;
    }, [meetings, filters, sortConfig]);

    // Calculate counts for filter dropdowns
    const statusCounts = useMemo(() => {
        const counts: Record<MeetingStatus, number> = {
            scheduled: 0, in_progress: 0, completed: 0, cancelled: 0,
        };
        meetings.forEach((m) => {
            if (m.status in counts) counts[m.status as MeetingStatus]++;
        });
        return counts;
    }, [meetings]);

    // Calculate template counts
    const templateCounts = useMemo(() => {
        const counts: Record<string, number> = { "no-template": 0 };
        meetings.forEach((m) => {
            if (m.templates?.id) {
                counts[m.templates.id] = (counts[m.templates.id] || 0) + 1;
            } else {
                counts["no-template"]++;
            }
        });
        return counts;
    }, [meetings]);

    // Handle meeting deletion (optimistic update)
    const handleMeetingDelete = useCallback((meetingId: string) => {
        setMeetings((prev) => prev.filter((m) => m.id !== meetingId));
    }, []);

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Meetings</h1>
                    <p className="text-muted-foreground mt-2">
                        Manage your meeting schedules, agendas, and history
                    </p>
                </div>
                {isLeader && (
                    <Button asChild>
                        <Link href="/meetings/new">
                            <Plus className="mr-2 h-4 w-4" />
                            New Meeting
                        </Link>
                    </Button>
                )}
            </div>

            <Separator />

            <MeetingsFilters
                onFilterChange={setFilters}
                statusCounts={statusCounts}
                templates={templates}
                templateCounts={templateCounts}
            />

            <div className="mt-6">
                <MeetingsTable
                    meetings={filteredMeetings}
                    workspaceSlug={workspaceSlug}
                    isLeader={isLeader}
                    sortConfig={sortConfig}
                    onSort={(key) => {
                        setSortConfig(current => {
                            if (current?.key === key) {
                                if (current.direction === 'asc') return { key, direction: 'desc' };
                                return null;
                            }
                            return { key, direction: 'asc' };
                        });
                    }}
                    onMeetingDelete={handleMeetingDelete}
                />
            </div>
        </div>
    );
}
