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
}

export function AnnouncementsClient({ announcements }: AnnouncementsClientProps) {
    const [filters, setFilters] = useState<{
        search: string;
        status: AnnouncementStatus[];
        priority: AnnouncementPriority[];
    }>({
        search: "",
        status: [],
        priority: [],
    });
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    const filteredAnnouncements = useMemo(() => {
        const result = announcements.filter((announcement) => {
            // Search filter
            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                const matchesSearch =
                    announcement.title?.toLowerCase().includes(searchLower) ||
                    announcement.content?.toLowerCase().includes(searchLower) ||
                    announcement.workspace_announcement_id?.toLowerCase().includes(searchLower);
                if (!matchesSearch) return false;
            }

            // Status filter
            if (filters.status.length > 0 && !filters.status.includes(announcement.status as AnnouncementStatus)) {
                return false;
            }

            // Priority filter
            return filters.priority.length === 0 || filters.priority.includes(announcement.priority as AnnouncementPriority);
        });

        if (sortConfig) {
            result.sort((a, b) => {
                const { key, direction } = sortConfig;
                let aValue = a[key as keyof Announcement];
                let bValue = b[key as keyof Announcement];

                if (aValue === null || aValue === undefined) return 1;
                if (bValue === null || bValue === undefined) return -1;

                // Priority ordering
                if (key === 'priority') {
                    const priorityOrder = { urgent: 1, high: 2, normal: 3, low: 4 };
                    aValue = priorityOrder[aValue as keyof typeof priorityOrder] || 99;
                    bValue = priorityOrder[bValue as keyof typeof priorityOrder] || 99;
                }

                if (aValue < bValue) return direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return result;
    }, [announcements, filters, sortConfig]);

    const statusCounts = useMemo(() => {
        const counts: Record<AnnouncementStatus, number> = { draft: 0, active: 0, expired: 0, archived: 0 };
        announcements.forEach((a) => {
            if (a.status in counts) counts[a.status as AnnouncementStatus]++;
        });
        return counts;
    }, [announcements]);

    const priorityCounts = useMemo(() => {
        const counts: Record<AnnouncementPriority, number> = { low: 0, normal: 0, high: 0, urgent: 0 };
        announcements.forEach((a) => {
            if (a.priority in counts) counts[a.priority as AnnouncementPriority]++;
        });
        return counts;
    }, [announcements]);

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
                onFilterChange={setFilters}
                statusCounts={statusCounts}
                priorityCounts={priorityCounts}
            />

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
