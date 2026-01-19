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
    Calendar,
    PlayCircle,
    CheckCheck,
    XCircle,
    FileText,
} from "lucide-react";

export type MeetingStatus = "scheduled" | "in_progress" | "completed" | "cancelled";

export interface Template {
    id: string;
    name: string;
}

interface MeetingFiltersProps {
    onFilterChange: (filters: {
        search: string;
        status: MeetingStatus[];
        templateIds: string[];
    }) => void;
    statusCounts?: Record<MeetingStatus, number>;
    templates?: Template[];
    templateCounts?: Record<string, number>;
}

const STATUS_OPTIONS: { value: MeetingStatus; label: string; icon: React.ReactNode }[] = [
    { value: "scheduled", label: "Scheduled", icon: <Calendar className="h-4 w-4 text-blue-500" /> },
    { value: "in_progress", label: "In Progress", icon: <PlayCircle className="h-4 w-4 text-yellow-500" /> },
    { value: "completed", label: "Completed", icon: <CheckCheck className="h-4 w-4 text-green-500" /> },
    { value: "cancelled", label: "Cancelled", icon: <XCircle className="h-4 w-4 text-muted-foreground" /> },
];

export function MeetingsFilters({
    onFilterChange,
    statusCounts,
    templates = [],
    templateCounts = {},
}: MeetingFiltersProps) {
    const [search, setSearch] = useState("");
    const [selectedStatuses, setSelectedStatuses] = useState<MeetingStatus[]>([]);
    const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);

    const handleSearchChange = (value: string) => {
        setSearch(value);
        onFilterChange({
            search: value,
            status: selectedStatuses,
            templateIds: selectedTemplates,
        });
    };

    const toggleStatus = (status: MeetingStatus) => {
        const newStatuses = selectedStatuses.includes(status)
            ? selectedStatuses.filter((s) => s !== status)
            : [...selectedStatuses, status];
        setSelectedStatuses(newStatuses);
        onFilterChange({ search, status: newStatuses, templateIds: selectedTemplates });
    };

    const toggleTemplate = (templateId: string) => {
        const newTemplates = selectedTemplates.includes(templateId)
            ? selectedTemplates.filter((t) => t !== templateId)
            : [...selectedTemplates, templateId];
        setSelectedTemplates(newTemplates);
        onFilterChange({ search, status: selectedStatuses, templateIds: newTemplates });
    };

    const clearFilters = () => {
        setSearch("");
        setSelectedStatuses([]);
        setSelectedTemplates([]);
        onFilterChange({ search: "", status: [], templateIds: [] });
    };

    const hasActiveFilters = search || selectedStatuses.length > 0 || selectedTemplates.length > 0;

    // Get template name by ID
    const getTemplateName = (id: string) => {
        if (id === "no-template") return "No Template";
        return templates.find((t) => t.id === id)?.name || "Unknown";
    };

    return (
        <div className="flex items-center gap-2 flex-wrap">
            <Input
                placeholder="Filter meetings..."
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

            {/* Template Filter */}
            {templates.length > 0 && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-9">
                            <FileText className="mr-2 h-4 w-4" />
                            Template
                            {selectedTemplates.length > 0 && (
                                <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                                    {selectedTemplates.length}
                                </span>
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-[260px] max-h-[300px] overflow-y-auto">
                        <div className="p-2">
                            <div className="space-y-1">
                                {/* No Template option */}
                                <button
                                    onClick={() => toggleTemplate("no-template")}
                                    className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                                >
                                    <div className="flex items-center gap-2">
                                        {selectedTemplates.includes("no-template") ? (
                                            <div className="h-4 w-4 rounded-sm border border-primary bg-primary flex items-center justify-center">
                                                <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
                                            </div>
                                        ) : (
                                            <div className="h-4 w-4 rounded-sm border border-input" />
                                        )}
                                        <FileText className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-muted-foreground italic">No Template</span>
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                        {templateCounts["no-template"] || 0}
                                    </span>
                                </button>

                                {/* Template options */}
                                {templates.map((template) => (
                                    <button
                                        key={template.id}
                                        onClick={() => toggleTemplate(template.id)}
                                        className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                                    >
                                        <div className="flex items-center gap-2">
                                            {selectedTemplates.includes(template.id) ? (
                                                <div className="h-4 w-4 rounded-sm border border-primary bg-primary flex items-center justify-center">
                                                    <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
                                                </div>
                                            ) : (
                                                <div className="h-4 w-4 rounded-sm border border-input" />
                                            )}
                                            <FileText className="h-4 w-4 text-blue-500" />
                                            <span className="truncate">{template.name}</span>
                                        </div>
                                        <span className="text-xs text-muted-foreground">
                                            {templateCounts[template.id] || 0}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </DropdownMenuContent>
                </DropdownMenu>
            )}

            {/* Active Filter Badges - Status */}
            {selectedStatuses.map((status) => {
                const option = STATUS_OPTIONS.find((o) => o.value === status);
                return (
                    <Button key={status} variant="secondary" size="sm" className="h-9" onClick={() => toggleStatus(status)}>
                        {option?.label}
                        <X className="ml-2 h-3 w-3" />
                    </Button>
                );
            })}

            {/* Active Filter Badges - Templates */}
            {selectedTemplates.map((templateId) => (
                <Button
                    key={templateId}
                    variant="secondary"
                    size="sm"
                    className="h-9"
                    onClick={() => toggleTemplate(templateId)}
                >
                    {getTemplateName(templateId)}
                    <X className="ml-2 h-3 w-3" />
                </Button>
            ))}

            {hasActiveFilters && (
                <Button variant="ghost" size="sm" className="h-9" onClick={clearFilters}>
                    Reset
                    <X className="ml-2 h-4 w-4" />
                </Button>
            )}
        </div>
    );
}
