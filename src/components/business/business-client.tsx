"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Plus } from "lucide-react";
import { BusinessFilters, BusinessStatus, BusinessCategory } from "./business-filters";
import { BusinessTable, BusinessItem } from "./business-table";

interface BusinessClientProps {
    items: BusinessItem[];
}

export function BusinessClient({ items }: BusinessClientProps) {
    const [filters, setFilters] = useState<{
        search: string;
        status: BusinessStatus[];
        category: BusinessCategory[];
    }>({
        search: "",
        status: [],
        category: [],
    });
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    const filteredItems = useMemo(() => {
        const result = items.filter((item) => {
            // Search filter
            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                const matchesSearch =
                    item.person_name?.toLowerCase().includes(searchLower) ||
                    item.position_calling?.toLowerCase().includes(searchLower) ||
                    item.workspace_business_id?.toLowerCase().includes(searchLower);
                if (!matchesSearch) return false;
            }

            // Status filter
            if (filters.status.length > 0 && !filters.status.includes(item.status as BusinessStatus)) {
                return false;
            }

            // Category filter
            return filters.category.length === 0 || filters.category.includes(item.category as BusinessCategory);
        });

        if (sortConfig) {
            result.sort((a, b) => {
                const { key, direction } = sortConfig;
                const aValue = a[key as keyof BusinessItem];
                const bValue = b[key as keyof BusinessItem];

                if (aValue === null || aValue === undefined) return 1;
                if (bValue === null || bValue === undefined) return -1;

                if (aValue < bValue) return direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return result;
    }, [items, filters, sortConfig]);

    const statusCounts = useMemo(() => {
        const counts: Record<BusinessStatus, number> = { pending: 0, completed: 0 };
        items.forEach((item) => {
            if (item.status in counts) counts[item.status as BusinessStatus]++;
        });
        return counts;
    }, [items]);

    const categoryCounts = useMemo(() => {
        const counts: Record<BusinessCategory, number> = {
            sustaining: 0, release: 0, set_apart: 0, ordination: 0, blessing: 0, membership_action: 0, other: 0,
        };
        items.forEach((item) => {
            if (item.category in counts) counts[item.category as BusinessCategory]++;
        });
        return counts;
    }, [items]);

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Business</h1>
                    <p className="text-muted-foreground mt-2">
                        Track formal church procedures and sustainings
                    </p>
                </div>
                <Button asChild>
                    <Link href="/business/new">
                        <Plus className="mr-2 h-4 w-4" />
                        New Business Item
                    </Link>
                </Button>
            </div>

            <Separator />

            <BusinessFilters
                onFilterChange={setFilters}
                statusCounts={statusCounts}
                categoryCounts={categoryCounts}
            />

            <div className="mt-6">
                <BusinessTable
                    items={filteredItems}
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
