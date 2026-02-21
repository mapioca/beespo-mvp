"use client";

import { useCallback, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
    PlusCircle,
    CircleCheck,
    X,
    Calendar,
    CirclePlay,
    CheckCheck,
    CircleX,
    FileText,
    Loader2,
} from "lucide-react";
import { useTranslations } from "next-intl";

export type MeetingStatus = "scheduled" | "in_progress" | "completed" | "cancelled";

export interface Template {
    id: string;
    name: string;
}

interface MeetingFiltersProps {
    statusCounts?: Record<MeetingStatus, number>;
    templates?: Template[];
    templateCounts?: Record<string, number>;
    currentFilters: {
        search: string;
        status: string[];
        templateIds: string[];
    };
}

const STATUS_OPTIONS: { value: MeetingStatus; label: string; icon: React.ReactNode }[] = [
    { value: "scheduled", label: "Scheduled", icon: <Calendar className="h-4 w-4 text-blue-500" /> },
    { value: "in_progress", label: "In Progress", icon: <CirclePlay className="h-4 w-4 text-yellow-500" /> },
    { value: "completed", label: "Completed", icon: <CheckCheck className="h-4 w-4 text-green-500" /> },
    { value: "cancelled", label: "Cancelled", icon: <CircleX className="h-4 w-4 text-red-500" /> },
];

export function MeetingsFilters({
    statusCounts,
    templates = [],
    templateCounts = {},
    currentFilters,
}: MeetingFiltersProps) {
    const t = useTranslations("Meetings.hub");
    const ts = useTranslations("Meetings.status");
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    // Helper to update URL params
    const updateUrlParams = useCallback((updates: Record<string, string | null>) => {
        const params = new URLSearchParams(searchParams.toString());

        // Reset to page 1 when filters change
        params.set("page", "1");

        Object.entries(updates).forEach(([key, value]) => {
            if (value === null || value === "") {
                params.delete(key);
            } else {
                params.set(key, value);
            }
        });

        startTransition(() => {
            router.push(`${pathname}?${params.toString()}`);
        });
    }, [router, pathname, searchParams]);

    const handleSearchChange = useCallback((value: string) => {
        updateUrlParams({ search: value || null });
    }, [updateUrlParams]);

    const toggleStatus = useCallback((status: MeetingStatus) => {
        const currentStatuses = currentFilters.status;
        const newStatuses = currentStatuses.includes(status)
            ? currentStatuses.filter((s) => s !== status)
            : [...currentStatuses, status];

        updateUrlParams({ status: newStatuses.length > 0 ? newStatuses.join(",") : null });
    }, [currentFilters.status, updateUrlParams]);

    const toggleTemplate = useCallback((templateId: string) => {
        const currentTemplates = currentFilters.templateIds;
        const newTemplates = currentTemplates.includes(templateId)
            ? currentTemplates.filter((t) => t !== templateId)
            : [...currentTemplates, templateId];

        updateUrlParams({ template: newTemplates.length > 0 ? newTemplates.join(",") : null });
    }, [currentFilters.templateIds, updateUrlParams]);

    const clearFilters = useCallback(() => {
        startTransition(() => {
            router.push(`${pathname}`);
        });
    }, [router, pathname]);

    const hasActiveFilters = currentFilters.search || currentFilters.status.length > 0 || currentFilters.templateIds.length > 0;

    // Get template name by ID
    const getTemplateName = (id: string) => {
        if (id === "no-template") return t("noTemplate");
        return templates.find((t) => t.id === id)?.name || "Unknown";
    };

    return (
        <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
                <Input
                    placeholder={t("filterPlaceholder")}
                    defaultValue={currentFilters.search}
                    onChange={(e) => {
                        // Use a local timeout for debouncing
                        const value = e.target.value;
                        setTimeout(() => handleSearchChange(value), 300);
                        // No return here
                    }}
                    className="max-w-xs"
                />
                {isPending && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
            </div>

            {/* Status Filter */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        {t("status")}
                        {currentFilters.status.length > 0 && (
                            <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                                {currentFilters.status.length}
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
                                        {currentFilters.status.includes(option.value) ? (
                                            <div className="h-4 w-4 rounded-sm border border-primary bg-primary flex items-center justify-center">
                                                <CircleCheck className="h-3 w-3 text-primary-foreground" />
                                            </div>
                                        ) : (
                                            <div className="h-4 w-4 rounded-sm border border-input" />
                                        )}
                                        {option.icon}
                                        <span>{ts(option.value)}</span>
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
                            {t("template")}
                            {currentFilters.templateIds.length > 0 && (
                                <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                                    {currentFilters.templateIds.length}
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
                                        {currentFilters.templateIds.includes("no-template") ? (
                                            <div className="h-4 w-4 rounded-sm border border-primary bg-primary flex items-center justify-center">
                                                <CircleCheck className="h-3 w-3 text-primary-foreground" />
                                            </div>
                                        ) : (
                                            <div className="h-4 w-4 rounded-sm border border-input" />
                                        )}
                                        <FileText className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-muted-foreground italic">{t("noTemplate")}</span>
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
                                            {currentFilters.templateIds.includes(template.id) ? (
                                                <div className="h-4 w-4 rounded-sm border border-primary bg-primary flex items-center justify-center">
                                                    <CircleCheck className="h-3 w-3 text-primary-foreground" />
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
            {currentFilters.status.map((status) => {
                return (
                    <Button key={status} variant="secondary" size="sm" className="h-9" onClick={() => toggleStatus(status as MeetingStatus)}>
                        {ts(status)}
                        <X className="ml-2 h-3 w-3" />
                    </Button>
                );
            })}

            {/* Active Filter Badges - Templates */}
            {currentFilters.templateIds.map((templateId) => (
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
                    {t("reset")}
                    <X className="ml-2 h-4 w-4" />
                </Button>
            )}

            {isPending && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {t("loading")}
                </span>
            )}
        </div>
    );
}
