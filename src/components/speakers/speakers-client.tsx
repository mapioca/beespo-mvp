"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Plus } from "lucide-react";
import { SpeakersFilters, SpeakerStatus } from "./speakers-filters";
import { SpeakersTable, Speaker } from "./speakers-table";

interface SpeakersClientProps {
    speakers: Speaker[];
    totalCount: number;
    statusCounts: Record<string, number>;
    currentFilters: {
        search: string;
    };
}

export function SpeakersClient({
    speakers,
    totalCount,
    statusCounts,
}: SpeakersClientProps) {
    // Client-side filters for status (not in URL yet)
    const [localFilters, setLocalFilters] = useState<{
        search: string;
        status: SpeakerStatus[];
    }>({
        search: "",
        status: [],
    });
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    // Apply client-side filters (status) and sort
    const filteredSpeakers = useMemo(() => {
        let result = speakers;

        // Status filter (client-side)
        if (localFilters.status.length > 0) {
            result = result.filter((speaker) =>
                localFilters.status.includes(speaker.is_confirmed ? "confirmed" : "pending" as SpeakerStatus)
            );
        }

        // Sort
        if (sortConfig) {
            result = [...result].sort((a, b) => {
                const { key, direction } = sortConfig;
                let aValue: string | boolean | number | null | undefined;
                let bValue: string | boolean | number | null | undefined;

                if (key === 'meeting_date') {
                    aValue = a.agenda_items?.[0]?.meeting?.scheduled_date || null;
                    bValue = b.agenda_items?.[0]?.meeting?.scheduled_date || null;
                } else {
                    aValue = a[key as keyof Speaker] as string | boolean | null;
                    bValue = b[key as keyof Speaker] as string | boolean | null;
                }

                if (aValue === null || aValue === undefined) return 1;
                if (bValue === null || bValue === undefined) return -1;

                if (aValue < bValue) return direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return result;
    }, [speakers, localFilters.status, sortConfig]);

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Speakers</h1>
                    <p className="text-muted-foreground mt-2">
                        Manage and track speakers across all meetings
                    </p>
                </div>
                <Button asChild>
                    <Link href="/speakers/new">
                        <Plus className="mr-2 h-4 w-4" />
                        New Speaker
                    </Link>
                </Button>
            </div>

            <Separator />

            <SpeakersFilters
                onFilterChange={setLocalFilters}
                statusCounts={statusCounts as Record<SpeakerStatus, number>}
            />

            {/* Speaker count */}
            <div className="text-sm text-muted-foreground">
                {totalCount} speaker{totalCount !== 1 ? 's' : ''} total
            </div>

            <div className="mt-6">
                <SpeakersTable
                    speakers={filteredSpeakers}
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
