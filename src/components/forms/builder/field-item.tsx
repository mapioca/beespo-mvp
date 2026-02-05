"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
    GripVertical,
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
    text: <Type className="h-4 w-4" />,
    textarea: <AlignLeft className="h-4 w-4" />,
    select: <ChevronDown className="h-4 w-4" />,
    radio: <Circle className="h-4 w-4" />,
    checkbox: <CheckSquare className="h-4 w-4" />,
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
            className={`
        flex items-center gap-3 p-3 rounded-lg border bg-card transition-colors
        ${isSelected ? "border-primary ring-1 ring-primary" : "hover:border-muted-foreground/50"}
        ${isDragging ? "shadow-lg" : ""}
      `}
        >
            {/* Drag Handle */}
            <button
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1"
                aria-label="Drag to reorder"
            >
                <GripVertical className="h-4 w-4" />
            </button>

            {/* Field Info */}
            <div
                className="flex-1 flex items-center gap-3 cursor-pointer"
                onClick={onSelect}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && onSelect()}
            >
                <div className="text-muted-foreground">
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
                        <Badge variant="secondary" className="text-xs">
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
                    <Settings2 className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={onRemove}
                    aria-label="Remove field"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
