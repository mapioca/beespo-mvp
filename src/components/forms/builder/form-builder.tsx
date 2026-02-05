"use client";

import { useState, useCallback } from "react";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus, Type, AlignLeft, ChevronDown, Circle, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FieldItem } from "./field-item";
import { FieldEditor } from "./field-editor";
import { LivePreview } from "./live-preview";
import type { BuilderField } from "./types";
import { createEmptyField, FIELD_TYPE_LABELS } from "./types";
import type { FormFieldType, FormSchema } from "@/types/form-types";

interface FormBuilderProps {
    initialTitle?: string;
    initialDescription?: string;
    initialFields?: BuilderField[];
    onSave: (data: { title: string; description: string; schema: FormSchema }) => Promise<void>;
    isSaving?: boolean;
}

const FIELD_TYPES: { type: FormFieldType; icon: React.ReactNode }[] = [
    { type: "text", icon: <Type className="h-4 w-4" /> },
    { type: "textarea", icon: <AlignLeft className="h-4 w-4" /> },
    { type: "select", icon: <ChevronDown className="h-4 w-4" /> },
    { type: "radio", icon: <Circle className="h-4 w-4" /> },
    { type: "checkbox", icon: <CheckSquare className="h-4 w-4" /> },
];

export function FormBuilder({
    initialTitle = "",
    initialDescription = "",
    initialFields = [],
    onSave,
    isSaving = false,
}: FormBuilderProps) {
    const [title, setTitle] = useState(initialTitle);
    const [description, setDescription] = useState(initialDescription);
    const [fields, setFields] = useState<BuilderField[]>(initialFields);
    const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const selectedField = fields.find((f) => f.id === selectedFieldId);

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setFields((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    }, []);

    const addField = useCallback((type: FormFieldType) => {
        const newField = createEmptyField(type);
        setFields((prev) => [...prev, newField]);
        setSelectedFieldId(newField.id);
    }, []);

    const removeField = useCallback((id: string) => {
        setFields((prev) => prev.filter((f) => f.id !== id));
        if (selectedFieldId === id) {
            setSelectedFieldId(null);
        }
    }, [selectedFieldId]);

    const updateField = useCallback((updatedField: BuilderField) => {
        setFields((prev) =>
            prev.map((f) => (f.id === updatedField.id ? updatedField : f))
        );
    }, []);

    const handleSave = async () => {
        const schema: FormSchema = {
            id: crypto.randomUUID(),
            title: title || "Untitled Form",
            description: description || undefined,
            fields: fields.map((field) => ({
                id: field.id,
                type: field.type,
                label: field.label,
                placeholder: field.placeholder || undefined,
                required: field.required,
                options: field.options.length > 0 ? field.options : undefined,
            })),
        };

        await onSave({ title, description, schema });
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            {/* Left Panel - Builder */}
            <div className="space-y-6 overflow-auto">
                {/* Form Details */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Form Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="form-title">Title</Label>
                            <Input
                                id="form-title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Enter form title"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="form-description">Description</Label>
                            <Textarea
                                id="form-description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Enter form description (optional)"
                                rows={2}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Fields List */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                        <CardTitle className="text-lg">Fields</CardTitle>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Field
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {FIELD_TYPES.map(({ type, icon }) => (
                                    <DropdownMenuItem
                                        key={type}
                                        onClick={() => addField(type)}
                                    >
                                        {icon}
                                        <span className="ml-2">{FIELD_TYPE_LABELS[type]}</span>
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </CardHeader>
                    <CardContent>
                        {fields.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                                <p className="text-sm">No fields yet</p>
                                <p className="text-xs mt-1">Click &quot;Add Field&quot; to get started</p>
                            </div>
                        ) : (
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext
                                    items={fields.map((f) => f.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <div className="space-y-2">
                                        {fields.map((field) => (
                                            <FieldItem
                                                key={field.id}
                                                field={field}
                                                isSelected={selectedFieldId === field.id}
                                                onSelect={() => setSelectedFieldId(field.id)}
                                                onRemove={() => removeField(field.id)}
                                            />
                                        ))}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        )}
                    </CardContent>
                </Card>

                {/* Field Editor */}
                {selectedField && (
                    <FieldEditor
                        field={selectedField}
                        onChange={updateField}
                    />
                )}

                {/* Save Button */}
                <Button
                    onClick={handleSave}
                    disabled={isSaving || !title.trim()}
                    className="w-full"
                >
                    {isSaving ? "Saving..." : "Save Form"}
                </Button>
            </div>

            {/* Right Panel - Live Preview */}
            <div className="hidden lg:block overflow-auto">
                <LivePreview
                    title={title}
                    description={description}
                    fields={fields}
                />
            </div>
        </div>
    );
}
