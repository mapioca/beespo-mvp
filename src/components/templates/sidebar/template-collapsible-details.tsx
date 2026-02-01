"use client";

import { useState } from "react";
import { ChevronDown, Calendar, Hash, Building2 } from "lucide-react";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

// Organization options - matches the existing template edit page
const ORGANIZATION_OPTIONS = [
    { value: "bishopric", label: "Bishopric" },
    { value: "ward_council", label: "Ward Council" },
    { value: "rs_presidency", label: "Relief Society Presidency" },
    { value: "elders_quorum", label: "Elders Quorum Presidency" },
    { value: "yw_presidency", label: "Young Women Presidency" },
    { value: "primary_presidency", label: "Primary Presidency" },
    { value: "other", label: "Other" },
];

interface TemplateCollapsibleDetailsProps {
    templateId: string;
    createdAt: string;
    organization?: string | null;
    onOrganizationChange?: (value: string) => void;
    isEditable?: boolean;
    defaultOpen?: boolean;
}

export function TemplateCollapsibleDetails({
    templateId,
    createdAt,
    organization,
    onOrganizationChange,
    isEditable = true,
    defaultOpen = true,
}: TemplateCollapsibleDetailsProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    const formattedDate = format(new Date(createdAt), "MMM d, yyyy");

    const organizationLabel = ORGANIZATION_OPTIONS.find(
        (opt) => opt.value === organization
    )?.label || "Not specified";

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
                <button
                    className={cn(
                        "flex items-center justify-between w-full py-2 px-1 text-sm font-semibold",
                        "hover:bg-muted/50 rounded-md transition-colors -mx-1"
                    )}
                >
                    <span className="text-muted-foreground uppercase tracking-wider text-xs">
                        Details
                    </span>
                    <ChevronDown
                        className={cn(
                            "h-4 w-4 text-muted-foreground transition-transform duration-200",
                            isOpen && "rotate-180"
                        )}
                    />
                </button>
            </CollapsibleTrigger>

            <CollapsibleContent className="space-y-3 pt-2">
                {/* Organization */}
                <div className="flex items-start gap-3">
                    <Building2 className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                        <span className="text-xs text-muted-foreground block">Organization</span>
                        {isEditable && onOrganizationChange ? (
                            <Select
                                value={organization || ""}
                                onValueChange={onOrganizationChange}
                            >
                                <SelectTrigger className="h-8 mt-1">
                                    <SelectValue placeholder="Select organization" />
                                </SelectTrigger>
                                <SelectContent>
                                    {ORGANIZATION_OPTIONS.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <span className="text-sm font-medium">
                                {organizationLabel}
                            </span>
                        )}
                    </div>
                </div>

                {/* Created Date */}
                <div className="flex items-start gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                        <span className="text-xs text-muted-foreground block">Created</span>
                        <span className="text-sm font-medium">
                            {formattedDate}
                        </span>
                    </div>
                </div>

                {/* Template ID */}
                <div className="flex items-start gap-3">
                    <Hash className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                        <span className="text-xs text-muted-foreground block">Template ID</span>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                            {templateId.slice(0, 8)}
                        </code>
                    </div>
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}
