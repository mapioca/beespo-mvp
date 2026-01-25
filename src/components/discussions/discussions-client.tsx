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
    totalCount: number;
    statusCounts: Record<string, number>;
    priorityCounts: Record<string, number>;
    categoryCounts: Record<string, number>;
    currentFilters: {
        search: string;
        status: string[];
    };
}

export function DiscussionsClient({
    discussions,
    totalCount,
    statusCounts,
    priorityCounts,
    categoryCounts,
}: DiscussionsClientProps) {
    // Client-side filters for priority and category (not in URL yet)
    const [localFilters, setLocalFilters] = useState<{
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

    // Apply client-side filters (priority, category) and sort
    const filteredDiscussions = useMemo(() => {
        let result = discussions;

        // Priority filter (client-side)
        if (localFilters.priority.length > 0) {
            result = result.filter((discussion) =>
                localFilters.priority.includes(discussion.priority as DiscussionPriority)
            );
        }

        // Category filter (client-side)
        if (localFilters.category.length > 0) {
            result = result.filter((discussion) =>
                localFilters.category.includes(discussion.category as DiscussionCategory)
            );
        }

        // Sort
        if (sortConfig) {
            result = [...result].sort((a, b) => {
                const { key, direction } = sortConfig;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                let aValue: any = a[key as keyof Discussion];
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                let bValue: any = b[key as keyof Discussion];

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
    }, [discussions, localFilters.priority, localFilters.category, sortConfig]);

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
                onFilterChange={setLocalFilters}
                statusCounts={statusCounts as Record<DiscussionStatus, number>}
                priorityCounts={priorityCounts as Record<DiscussionPriority, number>}
                categoryCounts={categoryCounts as Record<DiscussionCategory, number>}
            />

            {/* Discussion count */}
            <div className="text-sm text-muted-foreground">
                {totalCount} discussion{totalCount !== 1 ? 's' : ''} total
            </div>

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
