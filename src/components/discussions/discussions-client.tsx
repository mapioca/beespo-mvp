"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Plus } from "lucide-react";
import { DiscussionsFilters, DiscussionStatus, DiscussionPriority, DiscussionCategory } from "./discussions-filters";
import { DiscussionsTable, Discussion } from "./discussions-table";

interface DiscussionsClientProps {
    discussions: Discussion[];
}

export function DiscussionsClient({ discussions }: DiscussionsClientProps) {
    const [filters, setFilters] = useState<{
        search: string;
        status: DiscussionStatus[];
        priority: DiscussionPriority[];
        category: DiscussionCategory[];
    }>({
        search: "",
        status: [],
        priority: [],
        category: [],
    });
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    const filteredDiscussions = useMemo(() => {
        const result = discussions.filter((discussion) => {
            // Search filter
            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                const matchesSearch =
                    discussion.title?.toLowerCase().includes(searchLower) ||
                    discussion.description?.toLowerCase().includes(searchLower) ||
                    discussion.workspace_discussion_id?.toLowerCase().includes(searchLower);
                if (!matchesSearch) return false;
            }

            // Status filter
            if (filters.status.length > 0 && !filters.status.includes(discussion.status as DiscussionStatus)) {
                return false;
            }

            // Priority filter
            if (filters.priority.length > 0 && !filters.priority.includes(discussion.priority as DiscussionPriority)) {
                return false;
            }

            // Category filter
            return filters.category.length === 0 || filters.category.includes(discussion.category as DiscussionCategory);
        });

        if (sortConfig) {
            result.sort((a, b) => {
                const { key, direction } = sortConfig;
                let aValue = a[key as keyof Discussion];
                let bValue = b[key as keyof Discussion];

                // Handle nulls
                if (aValue === null || aValue === undefined) return 1;
                if (bValue === null || bValue === undefined) return -1;

                // Handle priority ordering
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
    }, [discussions, filters, sortConfig]);

    // Calculate counts for filter dropdowns
    const statusCounts = useMemo(() => {
        const counts: Record<DiscussionStatus, number> = {
            new: 0, active: 0, decision_required: 0, monitoring: 0, resolved: 0, deferred: 0,
        };
        discussions.forEach((d) => {
            if (d.status in counts) counts[d.status as DiscussionStatus]++;
        });
        return counts;
    }, [discussions]);

    const priorityCounts = useMemo(() => {
        const counts: Record<DiscussionPriority, number> = { low: 0, medium: 0, high: 0 };
        discussions.forEach((d) => {
            if (d.priority in counts) counts[d.priority as DiscussionPriority]++;
        });
        return counts;
    }, [discussions]);

    const categoryCounts = useMemo(() => {
        const counts: Record<DiscussionCategory, number> = {
            general: 0, budget: 0, personnel: 0, programs: 0, facilities: 0, welfare: 0, youth: 0, activities: 0,
        };
        discussions.forEach((d) => {
            if (d.category in counts) counts[d.category as DiscussionCategory]++;
        });
        return counts;
    }, [discussions]);

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Discussions</h1>
                    <p className="text-muted-foreground mt-2">
                        Track ongoing topics and decisions
                    </p>
                </div>
                <Button asChild>
                    <Link href="/discussions/new">
                        <Plus className="mr-2 h-4 w-4" />
                        New Discussion
                    </Link>
                </Button>
            </div>

            <Separator />

            <DiscussionsFilters
                onFilterChange={setFilters}
                statusCounts={statusCounts}
                priorityCounts={priorityCounts}
                categoryCounts={categoryCounts}
            />

            <div className="mt-6">
                <DiscussionsTable
                    discussions={filteredDiscussions}
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
