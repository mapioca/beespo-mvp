"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
    Trash2,
    Settings2,
    Type,
    AlignLeft,
    ChevronDown,
    Circle,
    CheckSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { BuilderField } from "./types";
import { FIELD_TYPE_LABELS } from "./types";
import type { FormFieldType } from "@/types/form-types";

interface FieldItemProps {
    field: BuilderField;
    isSelected: boolean;
    onSelect: () => void;
    onRemove: () => void;
}

const FIELD_ICONS: Record<FormFieldType, React.ReactNode> = {
    text: <Type className="h-4 w-4 stroke-[1.6]" />,
    textarea: <AlignLeft className="h-4 w-4 stroke-[1.6]" />,
    select: <ChevronDown className="h-4 w-4 stroke-[1.6]" />,
    radio: <Circle className="h-4 w-4 stroke-[1.6]" />,
    checkbox: <CheckSquare className="h-4 w-4 stroke-[1.6]" />,
};

export function FieldItem({
    field,
    isSelected,
    onSelect,
    onRemove,
}: FieldItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: field.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={`
        flex items-center gap-3 rounded-lg border border-border/60 bg-background/80 px-3 py-2.5 transition-colors cursor-grab active:cursor-grabbing
        ${isSelected ? "border-[hsl(var(--accent-warm-hover))] bg-[hsl(var(--accent-warm)/0.35)]" : "hover:bg-[hsl(var(--accent-warm)/0.25)]"}
        ${isDragging ? "shadow-lg" : ""}
      `}
        >
            {/* Field Info */}
            <div
                className="flex-1 flex items-center gap-3 cursor-pointer"
                onClick={onSelect}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && onSelect()}
            >
                {/* Boxed Icon */}
                <div className="flex-shrink-0 h-8 w-8 rounded-md border border-border/40 bg-[hsl(var(--accent-warm)/0.4)] flex items-center justify-center text-slate-700">
                    {FIELD_ICONS[field.type]}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{field.label}</p>
                    <p className="text-xs text-muted-foreground">
                        {FIELD_TYPE_LABELS[field.type]}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {field.required && (
                        <Badge variant="secondary" className="text-xs bg-[hsl(var(--accent-warm)/0.5)] text-slate-700 border border-[hsl(var(--accent-warm)/0.7)]">
                            Required
                        </Badge>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={onSelect}
                    aria-label="Edit field"
                >
                    <Settings2 className="h-4 w-4 stroke-[1.6]" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={onRemove}
                    aria-label="Remove field"
                >
                    <Trash2 className="h-4 w-4 stroke-[1.6]" />
                </Button>
            </div>
        </div>
    );
}
