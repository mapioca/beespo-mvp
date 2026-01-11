"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { CirclePlus, CheckCircle2, X, Circle, CheckCheck } from "lucide-react";

export type BusinessStatus = "pending" | "completed";
export type BusinessCategory =
    | "sustaining"
    | "release"
    | "confirmation"
    | "ordination"
    | "setting_apart"
    | "other";

interface BusinessFiltersProps {
    onFilterChange: (filters: {
        search: string;
        status: BusinessStatus[];
        category: BusinessCategory[];
    }) => void;
    statusCounts?: Record<BusinessStatus, number>;
    categoryCounts?: Record<BusinessCategory, number>;
}

const STATUS_OPTIONS: { value: BusinessStatus; label: string; icon: React.ReactNode }[] = [
    { value: "pending", label: "Pending", icon: <Circle className="h-4 w-4" /> },
    { value: "completed", label: "Completed", icon: <CheckCheck className="h-4 w-4 text-green-500" /> },
];

const CATEGORY_OPTIONS: { value: BusinessCategory; label: string }[] = [
    { value: "sustaining", label: "Sustaining" },
    { value: "release", label: "Release" },
    { value: "confirmation", label: "Confirmation" },
    { value: "ordination", label: "Ordination" },
    { value: "setting_apart", label: "Setting Apart" },
    { value: "other", label: "Other" },
];

export function BusinessFilters({ onFilterChange, statusCounts, categoryCounts }: BusinessFiltersProps) {
    const [search, setSearch] = useState("");
    const [selectedStatuses, setSelectedStatuses] = useState<BusinessStatus[]>([]);
    const [selectedCategories, setSelectedCategories] = useState<BusinessCategory[]>([]);

    const handleSearchChange = (value: string) => {
        setSearch(value);
        onFilterChange({ search: value, status: selectedStatuses, category: selectedCategories });
    };

    const toggleStatus = (status: BusinessStatus) => {
        const newStatuses = selectedStatuses.includes(status)
            ? selectedStatuses.filter((s) => s !== status)
            : [...selectedStatuses, status];
        setSelectedStatuses(newStatuses);
        onFilterChange({ search, status: newStatuses, category: selectedCategories });
    };

    const toggleCategory = (category: BusinessCategory) => {
        const newCategories = selectedCategories.includes(category)
            ? selectedCategories.filter((c) => c !== category)
            : [...selectedCategories, category];
        setSelectedCategories(newCategories);
        onFilterChange({ search, status: selectedStatuses, category: newCategories });
    };

    const clearFilters = () => {
        setSearch("");
        setSelectedStatuses([]);
        setSelectedCategories([]);
        onFilterChange({ search: "", status: [], category: [] });
    };

    const hasActiveFilters = search || selectedStatuses.length > 0 || selectedCategories.length > 0;

    return (
        <div className="flex items-center gap-2 flex-wrap">
            <Input
                placeholder="Filter business items..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="max-w-xs"
            />

            {/* Status Filter */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9">
                        <CirclePlus className="mr-2 h-4 w-4" />
                        Status
                        {selectedStatuses.length > 0 && (
                            <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                                {selectedStatuses.length}
                            </span>
                        )}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[200px]">
                    <div className="p-2">
                        <div className="space-y-1">
                            {STATUS_OPTIONS.map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => toggleStatus(option.value)}
                                    className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                                >
                                    <div className="flex items-center gap-2">
                                        {selectedStatuses.includes(option.value) ? (
                                            <div className="h-4 w-4 rounded-sm border border-primary bg-primary flex items-center justify-center">
                                                <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
                                            </div>
                                        ) : (
                                            <div className="h-4 w-4 rounded-sm border border-input" />
                                        )}
                                        {option.icon}
                                        <span>{option.label}</span>
                                    </div>
                                    {statusCounts && (
                                        <span className="text-xs text-muted-foreground">
                                            {statusCounts[option.value] || 0}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Category Filter */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9">
                        <CirclePlus className="mr-2 h-4 w-4" />
                        Category
                        {selectedCategories.length > 0 && (
                            <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                                {selectedCategories.length}
                            </span>
                        )}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[200px]">
                    <div className="p-2">
                        <div className="space-y-1 max-h-[300px] overflow-y-auto">
                            {CATEGORY_OPTIONS.map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => toggleCategory(option.value)}
                                    className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                                >
                                    <div className="flex items-center gap-2">
                                        {selectedCategories.includes(option.value) ? (
                                            <div className="h-4 w-4 rounded-sm border border-primary bg-primary flex items-center justify-center">
                                                <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
                                            </div>
                                        ) : (
                                            <div className="h-4 w-4 rounded-sm border border-input" />
                                        )}
                                        <span>{option.label}</span>
                                    </div>
                                    {categoryCounts && (
                                        <span className="text-xs text-muted-foreground">
                                            {categoryCounts[option.value] || 0}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Active Filter Badges */}
            {selectedStatuses.map((status) => {
                const option = STATUS_OPTIONS.find((o) => o.value === status);
                return (
                    <Button key={status} variant="secondary" size="sm" className="h-9" onClick={() => toggleStatus(status)}>
                        {option?.label}
                        <X className="ml-2 h-3 w-3" />
                    </Button>
                );
            })}

            {selectedCategories.map((category) => {
                const option = CATEGORY_OPTIONS.find((o) => o.value === category);
                return (
                    <Button key={category} variant="secondary" size="sm" className="h-9" onClick={() => toggleCategory(category)}>
                        {option?.label}
                        <X className="ml-2 h-3 w-3" />
                    </Button>
                );
            })}

            {hasActiveFilters && (
                <Button variant="ghost" size="sm" className="h-9" onClick={clearFilters}>
                    Reset
                    <X className="ml-2 h-4 w-4" />
                </Button>
            )}
        </div>
    );
}
