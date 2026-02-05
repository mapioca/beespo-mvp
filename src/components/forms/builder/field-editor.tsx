"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Plus, X } from "lucide-react";
import type { BuilderField } from "./types";
import { FIELD_TYPE_LABELS } from "./types";
import type { FormFieldType } from "@/types/form-types";

interface FieldEditorProps {
    field: BuilderField;
    onChange: (field: BuilderField) => void;
}

const FIELD_TYPES: FormFieldType[] = ["text", "textarea", "select", "radio", "checkbox"];

export function FieldEditor({ field, onChange }: FieldEditorProps) {
    const showOptions = field.type === "select" || field.type === "radio";

    const updateField = (updates: Partial<BuilderField>) => {
        onChange({ ...field, ...updates });
    };

    const addOption = () => {
        updateField({
            options: [...field.options, `Option ${field.options.length + 1}`],
        });
    };

    const removeOption = (index: number) => {
        const newOptions = field.options.filter((_, i) => i !== index);
        updateField({ options: newOptions });
    };

    const updateOption = (index: number, value: string) => {
        const newOptions = [...field.options];
        newOptions[index] = value;
        updateField({ options: newOptions });
    };

    return (
        <div className="space-y-6 p-4 border rounded-lg bg-card">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Field Properties
            </h3>

            {/* Field Type */}
            <div className="space-y-2">
                <Label htmlFor="field-type">Field Type</Label>
                <Select
                    value={field.type}
                    onValueChange={(value: FormFieldType) => {
                        const updates: Partial<BuilderField> = { type: value };
                        // Add default options if switching to select/radio
                        if ((value === "select" || value === "radio") && field.options.length === 0) {
                            updates.options = ["Option 1", "Option 2"];
                        }
                        updateField(updates);
                    }}
                >
                    <SelectTrigger id="field-type">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {FIELD_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                                {FIELD_TYPE_LABELS[type]}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Label */}
            <div className="space-y-2">
                <Label htmlFor="field-label">Label</Label>
                <Input
                    id="field-label"
                    value={field.label}
                    onChange={(e) => updateField({ label: e.target.value })}
                    placeholder="Enter field label"
                />
            </div>

            {/* Placeholder */}
            {field.type !== "checkbox" && field.type !== "radio" && (
                <div className="space-y-2">
                    <Label htmlFor="field-placeholder">
                        {field.type === "select" ? "Placeholder Text" : "Helper Text"}
                    </Label>
                    <Textarea
                        id="field-placeholder"
                        value={field.placeholder}
                        onChange={(e) => updateField({ placeholder: e.target.value })}
                        placeholder={field.type === "select" ? "Select an option..." : "Add helpful context..."}
                        rows={2}
                    />
                </div>
            )}

            {/* Required Toggle */}
            <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                    <Label htmlFor="field-required">Required</Label>
                    <p className="text-xs text-muted-foreground">
                        {field.type === "checkbox"
                            ? "User must check this box"
                            : "User must fill this field"}
                    </p>
                </div>
                <Switch
                    id="field-required"
                    checked={field.required}
                    onCheckedChange={(checked) => updateField({ required: checked })}
                />
            </div>

            {/* Options for Select/Radio */}
            {showOptions && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <Label>Options</Label>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addOption}
                        >
                            <Plus className="h-3 w-3 mr-1" />
                            Add Option
                        </Button>
                    </div>
                    <div className="space-y-2">
                        {field.options.map((option, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <Input
                                    value={option}
                                    onChange={(e) => updateOption(index, e.target.value)}
                                    placeholder={`Option ${index + 1}`}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 shrink-0"
                                    onClick={() => removeOption(index)}
                                    disabled={field.options.length <= 1}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
