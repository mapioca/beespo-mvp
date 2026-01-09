"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { CirclePlus, CheckCircle2, CircleSlash, Circle, X, ArrowUp, ArrowDown, Minus, User } from "lucide-react";

export type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled";
export type TaskPriority = "low" | "medium" | "high";

interface Assignee {
    id: string;
    full_name: string;
}

interface TaskFiltersProps {
    onFilterChange: (filters: {
        search: string;
        status: TaskStatus[];
        priority: TaskPriority[];
        assignees: string[];
    }) => void;
    statusCounts?: Record<TaskStatus, number>;
    priorityCounts?: Record<TaskPriority, number>;
    assignees?: Assignee[];
}

const STATUS_OPTIONS: { value: TaskStatus; label: string; icon: React.ReactNode }[] = [
    { value: "pending", label: "Todo", icon: <Circle className="h-4 w-4" /> },
    { value: "completed", label: "Done", icon: <CheckCircle2 className="h-4 w-4" /> },
    { value: "cancelled", label: "Canceled", icon: <CircleSlash className="h-4 w-4" /> },
];

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; icon: React.ReactNode }[] = [
    { value: "low", label: "Low", icon: <ArrowDown className="h-4 w-4" /> },
    { value: "medium", label: "Medium", icon: <Minus className="h-4 w-4" /> },
    { value: "high", label: "High", icon: <ArrowUp className="h-4 w-4" /> },
];

export function TaskFilters({ onFilterChange, statusCounts, priorityCounts, assignees = [] }: TaskFiltersProps) {
    const [search, setSearch] = useState("");
    const [selectedStatuses, setSelectedStatuses] = useState<TaskStatus[]>([]);
    const [selectedPriorities, setSelectedPriorities] = useState<TaskPriority[]>([]);
    const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);

    const handleSearchChange = (value: string) => {
        setSearch(value);
        onFilterChange({
            search: value,
            status: selectedStatuses,
            priority: selectedPriorities,
            assignees: selectedAssignees,
        });
    };

    const toggleStatus = (status: TaskStatus) => {
        const newStatuses = selectedStatuses.includes(status)
            ? selectedStatuses.filter((s) => s !== status)
            : [...selectedStatuses, status];
        setSelectedStatuses(newStatuses);
        onFilterChange({
            search,
            status: newStatuses,
            priority: selectedPriorities,
            assignees: selectedAssignees,
        });
    };

    const togglePriority = (priority: TaskPriority) => {
        const newPriorities = selectedPriorities.includes(priority)
            ? selectedPriorities.filter((p) => p !== priority)
            : [...selectedPriorities, priority];
        setSelectedPriorities(newPriorities);
        onFilterChange({
            search,
            status: selectedStatuses,
            priority: newPriorities,
            assignees: selectedAssignees,
        });
    };

    const toggleAssignee = (assigneeId: string) => {
        const newAssignees = selectedAssignees.includes(assigneeId)
            ? selectedAssignees.filter((a) => a !== assigneeId)
            : [...selectedAssignees, assigneeId];
        setSelectedAssignees(newAssignees);
        onFilterChange({
            search,
            status: selectedStatuses,
            priority: selectedPriorities,
            assignees: newAssignees,
        });
    };

    const clearFilters = () => {
        setSearch("");
        setSelectedStatuses([]);
        setSelectedPriorities([]);
        setSelectedAssignees([]);
        onFilterChange({
            search: "",
            status: [],
            priority: [],
            assignees: [],
        });
    };

    const hasActiveFilters = search || selectedStatuses.length > 0 || selectedPriorities.length > 0 || selectedAssignees.length > 0;

    return (
        <div className="flex items-center gap-2 flex-wrap">
            {/* Search Input */}
            <Input
                placeholder="Filter tasks..."
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
                        <Input
                            placeholder="Status"
                            className="h-8 mb-2"
                            readOnly
                        />
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
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full mt-2 h-8"
                            onClick={clearFilters}
                        >
                            Clear filters
                        </Button>
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
                        <Input
                            placeholder="Priority"
                            className="h-8 mb-2"
                            readOnly
                        />
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
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full mt-2 h-8"
                            onClick={clearFilters}
                        >
                            Clear filters
                        </Button>
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Assignee Filter */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9">
                        <CirclePlus className="mr-2 h-4 w-4" />
                        Assignee
                        {selectedAssignees.length > 0 && (
                            <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                                {selectedAssignees.length}
                            </span>
                        )}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[200px]">
                    <div className="p-2">
                        <Input
                            placeholder="Assignee"
                            className="h-8 mb-2"
                            readOnly
                        />
                        <div className="space-y-1">
                            {assignees.length === 0 ? (
                                <p className="text-sm text-muted-foreground px-2 py-1.5">No assignees</p>
                            ) : (
                                assignees.map((assignee) => (
                                    <button
                                        key={assignee.id}
                                        onClick={() => toggleAssignee(assignee.id)}
                                        className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                                    >
                                        <div className="flex items-center gap-2">
                                            {selectedAssignees.includes(assignee.id) ? (
                                                <div className="h-4 w-4 rounded-sm border border-primary bg-primary flex items-center justify-center">
                                                    <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
                                                </div>
                                            ) : (
                                                <div className="h-4 w-4 rounded-sm border border-input" />
                                            )}
                                            <User className="h-4 w-4" />
                                            <span>{assignee.full_name}</span>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full mt-2 h-8"
                            onClick={clearFilters}
                        >
                            Clear filters
                        </Button>
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Active Filter Badges */}
            {selectedStatuses.map((status) => {
                const option = STATUS_OPTIONS.find((o) => o.value === status);
                return (
                    <Button
                        key={status}
                        variant="secondary"
                        size="sm"
                        className="h-9"
                        onClick={() => toggleStatus(status)}
                    >
                        {option?.label}
                        <X className="ml-2 h-3 w-3" />
                    </Button>
                );
            })}

            {selectedPriorities.map((priority) => {
                const option = PRIORITY_OPTIONS.find((o) => o.value === priority);
                return (
                    <Button
                        key={priority}
                        variant="secondary"
                        size="sm"
                        className="h-9"
                        onClick={() => togglePriority(priority)}
                    >
                        {option?.label}
                        <X className="ml-2 h-3 w-3" />
                    </Button>
                );
            })}

            {selectedAssignees.map((assigneeId) => {
                const assignee = assignees.find((a) => a.id === assigneeId);
                return (
                    <Button
                        key={assigneeId}
                        variant="secondary"
                        size="sm"
                        className="h-9"
                        onClick={() => toggleAssignee(assigneeId)}
                    >
                        {assignee?.full_name}
                        <X className="ml-2 h-3 w-3" />
                    </Button>
                );
            })}

            {/* Reset Button */}
            {hasActiveFilters && (
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-9"
                    onClick={clearFilters}
                >
                    Reset
                    <X className="ml-2 h-4 w-4" />
                </Button>
            )}
        </div>
    );
}
