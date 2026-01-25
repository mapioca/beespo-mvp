"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Plus } from "lucide-react";
import { AnnouncementsFilters, AnnouncementStatus, AnnouncementPriority } from "./announcements-filters";
import { AnnouncementsTable, Announcement } from "./announcements-table";

interface AnnouncementsClientProps {
    announcements: Announcement[];
    totalCount: number;
    statusCounts: Record<string, number>;
    priorityCounts: Record<string, number>;
    currentFilters: {
        search: string;
        status: string[];
    };
}

export function AnnouncementsClient({
    announcements,
    totalCount,
    statusCounts,
    priorityCounts,
}: AnnouncementsClientProps) {
    // Client-side filters for priority (not in URL yet)
    const [localFilters, setLocalFilters] = useState<{
        search: string;
        status: AnnouncementStatus[];
        priority: AnnouncementPriority[];
    }>({
        search: "",
        status: [],
        priority: [],
    });
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    // Apply client-side filters (priority) and sort
    // Server already filtered by search and status
    const filteredAnnouncements = useMemo(() => {
        let result = announcements;

        // Priority filter (client-side)
        if (localFilters.priority.length > 0) {
            result = result.filter((announcement) =>
                localFilters.priority.includes(announcement.priority as AnnouncementPriority)
            );
        }

        // Sort
        if (sortConfig) {
            result = [...result].sort((a, b) => {
                const { key, direction } = sortConfig;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                let aValue: any = a[key as keyof Announcement];
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                let bValue: any = b[key as keyof Announcement];

                if (aValue === null || aValue === undefined) return 1;
                if (bValue === null || bValue === undefined) return -1;

                // Priority ordering
                if (key === 'priority') {
                    const priorityOrder = { high: 1, medium: 2, low: 3 };
                    aValue = priorityOrder[aValue as keyof typeof priorityOrder] || 99;
                    bValue = priorityOrder[bValue as keyof typeof priorityOrder] || 99;
                }

                if (aValue < bValue) return direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return result;
    }, [announcements, localFilters.priority, sortConfig]);

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Announcements</h1>
                    <p className="text-muted-foreground mt-2">
                        Manage time-based announcements for your organization
                    </p>
                </div>
                <Button asChild>
                    <Link href="/announcements/new">
                        <Plus className="mr-2 h-4 w-4" />
                        New Announcement
                    </Link>
                </Button>
            </div>

            <Separator />

            <AnnouncementsFilters
                onFilterChange={setLocalFilters}
                statusCounts={statusCounts as Record<AnnouncementStatus, number>}
                priorityCounts={priorityCounts as Record<AnnouncementPriority, number>}
            />

            {/* Announcement count */}
            <div className="text-sm text-muted-foreground">
                {totalCount} announcement{totalCount !== 1 ? 's' : ''} total
            </div>

            <div className="mt-6">
                <AnnouncementsTable
                    announcements={filteredAnnouncements}
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
