"use client";

import { useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { TemplateActionToolbar } from "./template-action-toolbar";
import { TemplateCollapsibleDetails } from "./template-collapsible-details";
import { AutoSaveTextarea } from "@/components/ui/auto-save-textarea";
import { TagsInput } from "@/components/ui/tags-input";
import { Button } from "@/components/ui/button";

interface TemplateContextPanelProps {
    templateId: string;
    description: string;
    organization: string;
    tags: string[];
    createdAt: string;
    onDescriptionChange: (value: string) => void;
    onOrganizationChange: (value: string) => void;
    onTagsChange: (tags: string[]) => void;
    onSave: () => Promise<void>;
    isSaving?: boolean;
    hasChanges?: boolean;
}

export function TemplateContextPanel({
    templateId,
    description,
    organization,
    tags,
    createdAt,
    onDescriptionChange,
    onOrganizationChange,
    onTagsChange,
    onSave,
    isSaving = false,
    hasChanges = false,
}: TemplateContextPanelProps) {
    const [isAddingDescription, setIsAddingDescription] = useState(false);

    // Check if description is empty
    const hasDescription = Boolean(description?.trim());

    // Handle description save (auto-save on blur)
    const handleDescriptionSave = useCallback(async (value: string) => {
        onDescriptionChange(value);
        // If cleared, reset adding state
        if (!value?.trim()) {
            setIsAddingDescription(false);
        }
    }, [onDescriptionChange]);

    return (
        <div className="bg-muted/30 border-l h-full flex flex-col overflow-hidden">
            {/* ============================================
                Section A: Action Toolbar (Pinned)
                - shrink-0: Never shrinks, always visible at top
                - Sticky actions remain accessible regardless of scroll
            ============================================ */}
            <div className="shrink-0 p-6 pb-4 border-b border-border/50">
                <TemplateActionToolbar
                    templateId={templateId}
                    onSave={onSave}
                    isSaving={isSaving}
                    hasChanges={hasChanges}
                />
            </div>

            {/* ============================================
                Scrollable Content Area (Reactive)
                - flex-1: Expands/contracts with viewport height
                - min-h-0: Critical for nested flex scrolling
                - overflow-y-auto: Independent internal scrolling
            ============================================ */}
            <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="p-6 pt-4 space-y-6">
                    {/* Section B: Template Description (Editable) */}
                    <div className="space-y-1">
                        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Description
                        </h3>
                        {!hasDescription && !isAddingDescription ? (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsAddingDescription(true)}
                                className="h-auto py-2 px-0 text-muted-foreground hover:text-foreground hover:bg-transparent justify-start font-normal"
                            >
                                <Plus className="h-4 w-4 mr-1.5" />
                                Add description
                            </Button>
                        ) : (
                            <AutoSaveTextarea
                                initialValue={description || ""}
                                onSave={handleDescriptionSave}
                                placeholder="Add a description..."
                                minRows={2}
                            />
                        )}
                    </div>

                    {/* Section C: Collapsible Details Card */}
                    <div className="bg-card border rounded-lg p-4">
                        <TemplateCollapsibleDetails
                            templateId={templateId}
                            createdAt={createdAt}
                            organization={organization}
                            onOrganizationChange={onOrganizationChange}
                            isEditable={true}
                            defaultOpen={true}
                        />
                    </div>

                    {/* Section D: Tags */}
                    <div className="space-y-2">
                        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Tags
                        </h3>
                        <TagsInput
                            tags={tags}
                            onTagsChange={onTagsChange}
                            placeholder="Add a tag (press Enter)"
                            helperText="Add tags to help organize and filter templates"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
