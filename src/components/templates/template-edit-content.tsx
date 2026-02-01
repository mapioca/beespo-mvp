"use client";

import { Clock, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { TemplateBuilder } from "@/components/templates/template-builder";
import { TemplateContextPanel } from "@/components/templates/sidebar";
import { TemplateItem } from "@/components/templates/types";

interface TemplateEditContentProps {
    templateId: string;
    name: string;
    description: string;
    organization: string;
    tags: string[];
    items: TemplateItem[];
    createdAt: string;
    onNameChange: (value: string) => void;
    onDescriptionChange: (value: string) => void;
    onOrganizationChange: (value: string) => void;
    onTagsChange: (tags: string[]) => void;
    onItemsChange: (items: TemplateItem[]) => void;
    onSave: () => Promise<void>;
    isSaving?: boolean;
    hasChanges?: boolean;
}

export function TemplateEditContent({
    templateId,
    name,
    description,
    organization,
    tags,
    items,
    createdAt,
    onNameChange,
    onDescriptionChange,
    onOrganizationChange,
    onTagsChange,
    onItemsChange,
    onSave,
    isSaving = false,
    hasChanges = false,
}: TemplateEditContentProps) {
    // Calculate total duration
    const totalDuration = items.reduce((acc, item) => acc + (item.duration_minutes || 0), 0);

    return (
        <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* ============================================
                Pane 1: Main Content (Template Builder)
                - flex-1: Grows to fill available space
                - min-w-0: Prevents flex item from overflowing
                - flex flex-col: Stack header + scrollable body
                - overflow-hidden: Contain internal scrolling
            ============================================ */}
            <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-background">
                {/* ----------------------------------------
                    Header Container (Pinned)
                    - shrink-0: Never shrinks, always visible
                    - bg-background: Solid background
                    - border-b: Visual separation
                    - z-10: Stays above scrolling content
                ---------------------------------------- */}
                <div className="shrink-0 bg-background border-b border-border z-10">
                    <div className="max-w-3xl mx-auto px-6 lg:px-8 py-6">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <FileText className="w-6 h-6 text-muted-foreground shrink-0" />
                            <Input
                                value={name}
                                onChange={(e) => onNameChange(e.target.value)}
                                placeholder="Template Name"
                                className="text-2xl lg:text-3xl font-bold tracking-tight border-0 px-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent h-auto"
                                disabled={isSaving}
                            />
                        </div>
                        <p className="text-muted-foreground flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span>{items.length} items</span>
                            <span className="text-muted-foreground/50">•</span>
                            <span>{totalDuration} min total</span>
                        </p>
                    </div>
                </div>

                {/* ----------------------------------------
                    Scrollable Body (Reactive)
                    - flex-1: Expands/contracts with viewport
                    - min-h-0: Critical for nested flex scrolling
                    - overflow-y-auto: Independent internal scrolling
                ---------------------------------------- */}
                <div className="flex-1 min-h-0 overflow-y-auto">
                    <div className="max-w-3xl mx-auto px-6 lg:px-8 py-6">
                        {/* Template Builder - Agenda Items */}
                        <TemplateBuilder
                            items={items}
                            onChange={onItemsChange}
                            isLoading={isSaving}
                        />
                    </div>
                </div>
            </div>

            {/* ============================================
                Pane 2: Inspector Panel (Right Sidebar)
                - Fixed width (350-400px responsive)
                - shrink-0: Maintains width, never shrinks
                - flex flex-col: Enable internal flex layout
                - overflow-hidden: Contain internal scrolling
            ============================================ */}
            <div className="w-[350px] lg:w-[400px] shrink-0 flex flex-col overflow-hidden">
                <TemplateContextPanel
                    templateId={templateId}
                    description={description}
                    organization={organization}
                    tags={tags}
                    createdAt={createdAt}
                    onDescriptionChange={onDescriptionChange}
                    onOrganizationChange={onOrganizationChange}
                    onTagsChange={onTagsChange}
                    onSave={onSave}
                    isSaving={isSaving}
                    hasChanges={hasChanges}
                />
            </div>
        </div>
    );
}
