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
    Circle,
    AlertTriangle,
    Eye,
    CheckCheck,
    Clock,
    ArrowUp,
    ArrowDown,
    Minus
} from "lucide-react";

export type DiscussionStatus = "new" | "active" | "decision_required" | "monitoring" | "resolved" | "deferred";
export type DiscussionPriority = "low" | "medium" | "high";
export type DiscussionCategory = "general" | "budget" | "personnel" | "programs" | "facilities" | "welfare" | "youth" | "activities";

interface DiscussionFiltersProps {
    onFilterChange: (filters: {
        search: string;
        status: DiscussionStatus[];
        priority: DiscussionPriority[];
        category: DiscussionCategory[];
    }) => void;
    statusCounts?: Record<DiscussionStatus, number>;
    priorityCounts?: Record<DiscussionPriority, number>;
    categoryCounts?: Record<DiscussionCategory, number>;
}

const STATUS_OPTIONS: { value: DiscussionStatus; label: string; icon: React.ReactNode }[] = [
    { value: "new", label: "New", icon: <Circle className="h-4 w-4" /> },
    { value: "active", label: "Active", icon: <CheckCircle2 className="h-4 w-4 text-blue-500" /> },
    { value: "decision_required", label: "Decision Required", icon: <AlertTriangle className="h-4 w-4 text-destructive" /> },
    { value: "monitoring", label: "Monitoring", icon: <Eye className="h-4 w-4" /> },
    { value: "resolved", label: "Resolved", icon: <CheckCheck className="h-4 w-4 text-green-500" /> },
    { value: "deferred", label: "Deferred", icon: <Clock className="h-4 w-4" /> },
];

const PRIORITY_OPTIONS: { value: DiscussionPriority; label: string; icon: React.ReactNode }[] = [
    { value: "low", label: "Low", icon: <ArrowDown className="h-4 w-4" /> },
    { value: "medium", label: "Medium", icon: <Minus className="h-4 w-4" /> },
    { value: "high", label: "High", icon: <ArrowUp className="h-4 w-4" /> },
];

const CATEGORY_OPTIONS: { value: DiscussionCategory; label: string }[] = [
    { value: "general", label: "General" },
    { value: "budget", label: "Budget" },
    { value: "personnel", label: "Personnel" },
    { value: "programs", label: "Programs" },
    { value: "facilities", label: "Facilities" },
    { value: "welfare", label: "Welfare" },
    { value: "youth", label: "Youth" },
    { value: "activities", label: "Activities" },
];

export function DiscussionsFilters({ onFilterChange, statusCounts, priorityCounts, categoryCounts }: DiscussionFiltersProps) {
    const [search, setSearch] = useState("");
    const [selectedStatuses, setSelectedStatuses] = useState<DiscussionStatus[]>([]);
    const [selectedPriorities, setSelectedPriorities] = useState<DiscussionPriority[]>([]);
    const [selectedCategories, setSelectedCategories] = useState<DiscussionCategory[]>([]);

    const handleSearchChange = (value: string) => {
        setSearch(value);
        onFilterChange({
            search: value,
            status: selectedStatuses,
            priority: selectedPriorities,
            category: selectedCategories,
        });
    };

    const toggleStatus = (status: DiscussionStatus) => {
        const newStatuses = selectedStatuses.includes(status)
            ? selectedStatuses.filter((s) => s !== status)
            : [...selectedStatuses, status];
        setSelectedStatuses(newStatuses);
        onFilterChange({ search, status: newStatuses, priority: selectedPriorities, category: selectedCategories });
    };

    const togglePriority = (priority: DiscussionPriority) => {
        const newPriorities = selectedPriorities.includes(priority)
            ? selectedPriorities.filter((p) => p !== priority)
            : [...selectedPriorities, priority];
        setSelectedPriorities(newPriorities);
        onFilterChange({ search, status: selectedStatuses, priority: newPriorities, category: selectedCategories });
    };

    const toggleCategory = (category: DiscussionCategory) => {
        const newCategories = selectedCategories.includes(category)
            ? selectedCategories.filter((c) => c !== category)
            : [...selectedCategories, category];
        setSelectedCategories(newCategories);
        onFilterChange({ search, status: selectedStatuses, priority: selectedPriorities, category: newCategories });
    };

    const clearFilters = () => {
        setSearch("");
        setSelectedStatuses([]);
        setSelectedPriorities([]);
        setSelectedCategories([]);
        onFilterChange({ search: "", status: [], priority: [], category: [] });
    };

    const hasActiveFilters = search || selectedStatuses.length > 0 || selectedPriorities.length > 0 || selectedCategories.length > 0;

    return (
        <div className="flex items-center gap-2 flex-wrap">
            <Input
                placeholder="Filter discussions..."
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
                <DropdownMenuContent align="start" className="w-[220px]">
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

            {selectedPriorities.map((priority) => {
                const option = PRIORITY_OPTIONS.find((o) => o.value === priority);
                return (
                    <Button key={priority} variant="secondary" size="sm" className="h-9" onClick={() => togglePriority(priority)}>
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
