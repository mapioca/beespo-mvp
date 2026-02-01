"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Plus } from "lucide-react";
import { MeetingsFilters } from "./meetings-filters";
import type { MeetingStatus, Template } from "./meetings-filters";
import { MeetingsTable } from "./meetings-table";
import type { Meeting } from "./meetings-table";

interface MeetingsClientProps {
    meetings: Meeting[];
    templates: Template[];
    workspaceSlug: string | null;
    isLeader: boolean;
    statusCounts: Record<string, number>;
    templateCounts: Record<string, number>;
    currentFilters: {
        search: string;
        status: string[];
        templateIds: string[];
    };
}

export function MeetingsClient({
    meetings,
    templates,
    workspaceSlug,
    isLeader,
    statusCounts,
    templateCounts,
    currentFilters,
}: MeetingsClientProps) {
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    // Client-side sorting only (filtering is now server-side)
    const sortedMeetings = useMemo(() => {
        if (!sortConfig) return meetings;

        return [...meetings].sort((a, b) => {
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
    }, [meetings, sortConfig]);

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
                statusCounts={statusCounts as Record<MeetingStatus, number>}
                templates={templates}
                templateCounts={templateCounts}
                currentFilters={currentFilters}
            />

            <div className="mt-6">
                <MeetingsTable
                    meetings={sortedMeetings}
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
                />
            </div>
        </div>
    );
}
