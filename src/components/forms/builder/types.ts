// Form Builder Types

import type { FormFieldType } from "@/types/form-types";

export interface BuilderField {
    id: string;
    type: FormFieldType;
    label: string;
    placeholder: string;
    required: boolean;
    options: string[];
}

export interface FormBuilderState {
    title: string;
    description: string;
    fields: BuilderField[];
}

export const FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
    text: "Short Text",
    textarea: "Long Text",
    select: "Dropdown",
    radio: "Multiple Choice",
    checkbox: "Checkbox",
};

export const FIELD_TYPE_ICONS: Record<FormFieldType, string> = {
    text: "Type",
    textarea: "AlignLeft",
    select: "ChevronDown",
    radio: "Circle",
    checkbox: "CheckSquare",
};

export function createEmptyField(type: FormFieldType): BuilderField {
    const id = crypto.randomUUID();
    return {
        id,
        type,
        label: `${FIELD_TYPE_LABELS[type]} Field`,
        placeholder: "",
        required: false,
        options: type === "select" || type === "radio" ? ["Option 1", "Option 2"] : [],
    };
}
