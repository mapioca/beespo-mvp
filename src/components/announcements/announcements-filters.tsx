"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
    CirclePlus,
    CheckCircle2,
    X,
    FileEdit,
    CheckCircle,
    Clock,
    Archive,
    ArrowUp,
    ArrowDown,
    Minus,
    AlertCircle
} from "lucide-react";

export type AnnouncementStatus = "draft" | "active" | "expired" | "archived";
export type AnnouncementPriority = "low" | "normal" | "high" | "urgent";

interface AnnouncementFiltersProps {
    onFilterChange: (filters: {
        search: string;
        status: AnnouncementStatus[];
        priority: AnnouncementPriority[];
    }) => void;
    statusCounts?: Record<AnnouncementStatus, number>;
    priorityCounts?: Record<AnnouncementPriority, number>;
}

const STATUS_OPTIONS: { value: AnnouncementStatus; label: string; icon: React.ReactNode }[] = [
    { value: "draft", label: "Draft", icon: <FileEdit className="h-4 w-4" /> },
    { value: "active", label: "Active", icon: <CheckCircle className="h-4 w-4 text-green-500" /> },
    { value: "expired", label: "Expired", icon: <Clock className="h-4 w-4 text-muted-foreground" /> },
    { value: "archived", label: "Archived", icon: <Archive className="h-4 w-4" /> },
];

const PRIORITY_OPTIONS: { value: AnnouncementPriority; label: string; icon: React.ReactNode }[] = [
    { value: "low", label: "Low", icon: <ArrowDown className="h-4 w-4" /> },
    { value: "normal", label: "Normal", icon: <Minus className="h-4 w-4" /> },
    { value: "high", label: "High", icon: <ArrowUp className="h-4 w-4" /> },
    { value: "urgent", label: "Urgent", icon: <AlertCircle className="h-4 w-4 text-destructive" /> },
];

export function AnnouncementsFilters({ onFilterChange, statusCounts, priorityCounts }: AnnouncementFiltersProps) {
    const [search, setSearch] = useState("");
    const [selectedStatuses, setSelectedStatuses] = useState<AnnouncementStatus[]>([]);
    const [selectedPriorities, setSelectedPriorities] = useState<AnnouncementPriority[]>([]);

    const handleSearchChange = (value: string) => {
        setSearch(value);
        onFilterChange({ search: value, status: selectedStatuses, priority: selectedPriorities });
    };

    const toggleStatus = (status: AnnouncementStatus) => {
        const newStatuses = selectedStatuses.includes(status)
            ? selectedStatuses.filter((s) => s !== status)
            : [...selectedStatuses, status];
        setSelectedStatuses(newStatuses);
        onFilterChange({ search, status: newStatuses, priority: selectedPriorities });
    };

    const togglePriority = (priority: AnnouncementPriority) => {
        const newPriorities = selectedPriorities.includes(priority)
            ? selectedPriorities.filter((p) => p !== priority)
            : [...selectedPriorities, priority];
        setSelectedPriorities(newPriorities);
        onFilterChange({ search, status: selectedStatuses, priority: newPriorities });
    };

    const clearFilters = () => {
        setSearch("");
        setSelectedStatuses([]);
        setSelectedPriorities([]);
        onFilterChange({ search: "", status: [], priority: [] });
    };

    const hasActiveFilters = search || selectedStatuses.length > 0 || selectedPriorities.length > 0;

    return (
        <div className="flex items-center gap-2 flex-wrap">
            <Input
                placeholder="Filter announcements..."
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

            {/* Priority Filter */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9">
                        <CirclePlus className="mr-2 h-4 w-4" />
                        Priority
                        {selectedPriorities.length > 0 && (
                            <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                                {selectedPriorities.length}
                            </span>
                        )}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[200px]">
                    <div className="p-2">
                        <div className="space-y-1">
                            {PRIORITY_OPTIONS.map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => togglePriority(option.value)}
                                    className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                                >
                                    <div className="flex items-center gap-2">
                                        {selectedPriorities.includes(option.value) ? (
                                            <div className="h-4 w-4 rounded-sm border border-primary bg-primary flex items-center justify-center">
                                                <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
                                            </div>
                                        ) : (
                                            <div className="h-4 w-4 rounded-sm border border-input" />
                                        )}
                                        {option.icon}
                                        <span>{option.label}</span>
                                    </div>
                                    {priorityCounts && (
                                        <span className="text-xs text-muted-foreground">
                                            {priorityCounts[option.value] || 0}
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

            {selectedPriorities.map((priority) => {
                const option = PRIORITY_OPTIONS.find((o) => o.value === priority);
                return (
                    <Button key={priority} variant="secondary" size="sm" className="h-9" onClick={() => togglePriority(priority)}>
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
