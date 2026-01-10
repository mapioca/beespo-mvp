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
}

export function SpeakersClient({ speakers }: SpeakersClientProps) {
    const [filters, setFilters] = useState<{
        search: string;
        status: SpeakerStatus[];
    }>({
        search: "",
        status: [],
    });
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    const filteredSpeakers = useMemo(() => {
        const result = speakers.filter((speaker) => {
            // Search filter
            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                const matchesSearch =
                    speaker.name?.toLowerCase().includes(searchLower) ||
                    speaker.topic?.toLowerCase().includes(searchLower) ||
                    speaker.workspace_speaker_id?.toLowerCase().includes(searchLower);
                if (!matchesSearch) return false;
            }

            // Status filter
            return filters.status.length === 0 || filters.status.includes(speaker.is_confirmed ? "confirmed" : "pending" as SpeakerStatus);
        });

        if (sortConfig) {
            result.sort((a, b) => {
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
    }, [speakers, filters, sortConfig]);

    const statusCounts = useMemo(() => {
        const counts: Record<SpeakerStatus, number> = { confirmed: 0, pending: 0 };
        speakers.forEach((s) => {
            if (s.is_confirmed) counts.confirmed++;
            else counts.pending++;
        });
        return counts;
    }, [speakers]);

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
                onFilterChange={setFilters}
                statusCounts={statusCounts}
            />

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
