import { z } from "zod";
import type { FormSchema, FormField } from "@/types/form-types";

/**
 * Converts a FormSchema to a Zod validation schema at runtime.
 * This enables dynamic form validation based on JSON-defined form structure.
 */
export function schemaToZod(
    schema: FormSchema
): z.ZodObject<Record<string, z.ZodTypeAny>> {
    const shape: Record<string, z.ZodTypeAny> = {};

    for (const field of schema.fields) {
        shape[field.id] = fieldToZod(field);
    }

    return z.object(shape);
}

/**
 * Converts a single FormField to its corresponding Zod schema
 */
function fieldToZod(field: FormField): z.ZodTypeAny {
    switch (field.type) {
        case "text":
            return field.required
                ? z.string().min(1, `${field.label} is required`)
                : z.string().optional().or(z.literal(""));

        case "textarea":
            return field.required
                ? z.string().min(1, `${field.label} is required`)
                : z.string().optional().or(z.literal(""));

        case "select":
            if (field.required) {
                return z.string().min(1, `Please select a ${field.label.toLowerCase()}`);
            }
            return z.string().optional().or(z.literal(""));

        case "radio":
            if (field.required) {
                return z.string().min(1, `Please select an option for ${field.label}`);
            }
            return z.string().optional().or(z.literal(""));

        case "checkbox":
            if (field.required) {
                // For required checkboxes, user must check it
                return z
                    .boolean()
                    .refine((val) => val === true, {
                        message: `${field.label} must be checked`,
                    });
            }
            return z.boolean().optional().default(false);

        default:
            // Fallback for unknown types
            return z.any();
    }
}

/**
 * Gets default values for a form schema (useful for react-hook-form)
 */
export function getSchemaDefaults(
    schema: FormSchema
): Record<string, string | boolean> {
    const defaults: Record<string, string | boolean> = {};

    for (const field of schema.fields) {
        switch (field.type) {
            case "checkbox":
                defaults[field.id] = false;
                break;
            case "text":
            case "textarea":
            case "select":
            case "radio":
            default:
                defaults[field.id] = "";
                break;
        }
    }

    return defaults;
}
