"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ArrowLeft, ChevronDown, FileText, Loader2, X } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface TemplateMetadataHeaderProps {
    name: string;
    onNameChange: (value: string) => void;
    description: string;
    onDescriptionChange: (value: string) => void;
    organization: string;
    onOrganizationChange: (value: string) => void;
    tags: string[];
    onTagsChange: (tags: string[]) => void;
    onSave: () => void;
    isSaving: boolean;
    isRedirecting?: boolean;
    isValid: boolean;
    itemCount: number;
    totalDuration: number;
}

const ORGANIZATION_OPTIONS = [
    { value: "bishopric", label: "Bishopric" },
    { value: "ward_council", label: "Ward Council" },
    { value: "rs_presidency", label: "Relief Society Presidency" },
    { value: "elders_quorum", label: "Elders Quorum Presidency" },
    { value: "yw_presidency", label: "Young Women Presidency" },
    { value: "primary_presidency", label: "Primary Presidency" },
    { value: "other", label: "Other" },
];

export function TemplateMetadataHeader({
    name,
    onNameChange,
    description,
    onDescriptionChange,
    organization,
    onOrganizationChange,
    tags,
    onTagsChange,
    onSave,
    isSaving,
    isRedirecting = false,
    isValid,
    itemCount,
    totalDuration,
}: TemplateMetadataHeaderProps) {
    const router = useRouter();
    const [tagInput, setTagInput] = useState("");
    const [isDetailsOpen, setIsDetailsOpen] = useState(true);

    const handleAddTag = () => {
        const trimmedTag = tagInput.trim();
        if (trimmedTag && !tags.includes(trimmedTag)) {
            onTagsChange([...tags, trimmedTag]);
            setTagInput("");
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        onTagsChange(tags.filter((tag) => tag !== tagToRemove));
    };

    const handleTagKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleAddTag();
        }
    };

    return (
        <div className="shrink-0 border-b bg-background">
            {/* Top Row: Back + Template Name + Actions */}
            <div className="flex items-center gap-4 px-6 py-4">
                {/* Back Button */}
                <Button variant="ghost" size="sm" asChild className="-ml-2">
                    <Link href="/templates">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </Link>
                </Button>

                {/* Icon + Template Name Input */}
                <div className="flex items-center gap-3 flex-1">
                    <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                    <Input
                        value={name}
                        onChange={(e) => onNameChange(e.target.value)}
                        placeholder="Template Name *"
                        className="text-lg font-semibold border-0 px-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent h-auto max-w-md"
                        disabled={isSaving}
                    />
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{itemCount} items</span>
                    <span>{totalDuration} min</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => router.push("/templates")}
                        disabled={isSaving}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={onSave}
                        disabled={isSaving || !isValid}
                        className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                    >
                        {isRedirecting ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Redirecting...
                            </>
                        ) : isSaving ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Creating...
                            </>
                        ) : (
                            "Create Template"
                        )}
                    </Button>
                </div>
            </div>

            {/* Collapsible Details Row */}
            <Collapsible open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <CollapsibleTrigger asChild>
                    <button
                        className={cn(
                            "w-full flex items-center gap-2 px-6 py-2 text-sm text-muted-foreground",
                            "hover:bg-muted/50 transition-colors border-t",
                            isDetailsOpen && "bg-muted/30"
                        )}
                    >
                        <ChevronDown
                            className={cn(
                                "h-4 w-4 transition-transform",
                                isDetailsOpen && "rotate-180"
                            )}
                        />
                        <span>Template Details</span>
                        {(description || organization || tags.length > 0) && (
                            <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                {[description && "description", organization && "org", tags.length > 0 && `${tags.length} tags`]
                                    .filter(Boolean)
                                    .join(", ")}
                            </span>
                        )}
                    </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <div className="px-6 py-4 bg-muted/20 border-t space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Description */}
                            <div className="md:col-span-2 space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground">
                                    Description
                                </label>
                                <Textarea
                                    value={description}
                                    onChange={(e) => onDescriptionChange(e.target.value)}
                                    placeholder="Brief description of this template..."
                                    rows={2}
                                    disabled={isSaving}
                                    className="resize-none"
                                />
                            </div>

                            {/* Organization */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground">
                                    Organization
                                </label>
                                <Select
                                    value={organization}
                                    onValueChange={onOrganizationChange}
                                    disabled={isSaving}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select (optional)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ORGANIZATION_OPTIONS.map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Tags */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">
                                Tags
                            </label>
                            <div className="flex items-center gap-2 flex-wrap">
                                <Input
                                    value={tagInput}
                                    onChange={(e) => setTagInput(e.target.value)}
                                    onKeyDown={handleTagKeyDown}
                                    placeholder="Add tag (Enter)"
                                    disabled={isSaving}
                                    className="w-40"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleAddTag}
                                    disabled={!tagInput.trim() || isSaving}
                                >
                                    Add
                                </Button>
                                {tags.map((tag) => (
                                    <Badge key={tag} variant="secondary" className="gap-1">
                                        {tag}
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveTag(tag)}
                                            disabled={isSaving}
                                            className="hover:bg-secondary-foreground/20 rounded-full"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </div>
    );
}
