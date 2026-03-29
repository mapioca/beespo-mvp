"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useTransition } from "react";
import type { FormSchema, FormField } from "@/types/form-types";
import { schemaToZod, getSchemaDefaults } from "@/lib/forms/schema-to-zod";
import {
    Form,
    FormControl,
    FormDescription,
    FormField as FormFieldComponent,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface FormRendererProps {
    schema: FormSchema;
    onSubmit: (data: Record<string, unknown>) => Promise<void>;
    submitButtonText?: string;
    isPreview?: boolean;
}

/**
 * Dynamic form renderer that generates UI from a JSON schema.
 * Uses react-hook-form with dynamic Zod validation.
 */
export function FormRenderer({
    schema,
    onSubmit,
    submitButtonText = "Submit",
    isPreview = false,
}: FormRendererProps) {
    const [isPending, startTransition] = useTransition();

    // Generate Zod schema from form schema
    const zodSchema = useMemo(() => schemaToZod(schema), [schema]);
    const resolver = useMemo(() => zodResolver(zodSchema), [zodSchema]);
    const defaultValues = useMemo(() => getSchemaDefaults(schema), [schema]);

    const form = useForm({
        resolver,
        defaultValues,
        mode: "onBlur",
    });

    const handleSubmit = form.handleSubmit((data) => {
        if (isPreview) return;
        startTransition(async () => {
            await onSubmit(data);
        });
    });

    if (schema.fields.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <p>No fields have been added to this form yet.</p>
            </div>
        );
    }

    return (
        <Form {...form}>
            <form onSubmit={handleSubmit} className="space-y-5">
                {schema.fields.map((field) => (
                    <DynamicFormField key={field.id} field={field} form={form} />
                ))}

                <Button
                    type="submit"
                    className="w-full bg-[hsl(var(--accent-warm))] text-foreground hover:bg-[hsl(var(--accent-warm-hover))] shadow-none"
                    disabled={isPending || isPreview}
                >
                    {isPending ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Submitting...
                        </>
                    ) : (
                        submitButtonText
                    )}
                </Button>
            </form>
        </Form>
    );
}

interface DynamicFormFieldProps {
    field: FormField;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    form: ReturnType<typeof useForm<any>>;
}

/**
 * Renders a single form field based on its type
 */
function DynamicFormField({ field, form }: DynamicFormFieldProps) {
    return (
        <FormFieldComponent
            control={form.control}
            name={field.id}
            render={({ field: formField }) => (
                <FormItem className="space-y-2 rounded-lg border border-border/50 bg-background/60 p-3">
                    {field.type !== "checkbox" && (
                        <FormLabel className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                            {field.label}
                            {field.required && (
                                <span className="text-destructive ml-1" aria-hidden="true">
                                    *
                                </span>
                            )}
                        </FormLabel>
                    )}

                    <FormControl>
                        {renderFieldInput(field, formField)}
                    </FormControl>

                    {field.placeholder && field.type !== "select" && field.type !== "radio" && (
                        <FormDescription className="text-xs text-muted-foreground">
                            {field.placeholder}
                        </FormDescription>
                    )}

                    <FormMessage />
                </FormItem>
            )}
        />
    );
}

/**
 * Renders the appropriate input component based on field type
 */
function renderFieldInput(
    field: FormField,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    formField: any
) {
    switch (field.type) {
        case "text":
            return (
                <Input
                    {...formField}
                    placeholder={field.placeholder}
                    aria-required={field.required}
                    aria-label={field.label}
                    className="bg-background border-border/60 focus-visible:ring-0 focus-visible:border-foreground/30"
                />
            );

        case "textarea":
            return (
                <Textarea
                    {...formField}
                    placeholder={field.placeholder}
                    aria-required={field.required}
                    aria-label={field.label}
                    rows={4}
                    className="bg-background border-border/60 focus-visible:ring-0 focus-visible:border-foreground/30"
                />
            );

        case "select":
            return (
                <Select
                    onValueChange={formField.onChange}
                    value={formField.value}
                >
                    <SelectTrigger aria-label={field.label} className="bg-background border-border/60 focus:ring-0 focus:border-foreground/30">
                        <SelectValue placeholder={field.placeholder || "Select an option"} />
                    </SelectTrigger>
                    <SelectContent>
                        {field.options?.map((option) => (
                            <SelectItem key={option} value={option}>
                                {option}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            );

        case "radio":
            return (
                <RadioGroup
                    onValueChange={formField.onChange}
                    value={formField.value}
                    className="flex flex-col space-y-2"
                    aria-label={field.label}
                >
                    {field.options?.map((option) => (
                        <div key={option} className="flex items-center space-x-2 rounded-md border border-border/50 bg-background/70 px-2.5 py-2">
                            <RadioGroupItem value={option} id={`${field.id}-${option}`} />
                            <label
                                htmlFor={`${field.id}-${option}`}
                                className="text-sm font-normal cursor-pointer"
                            >
                                {option}
                            </label>
                        </div>
                    ))}
                </RadioGroup>
            );

        case "checkbox":
            return (
                <div className="flex items-center space-x-2 rounded-md border border-border/50 bg-background/70 px-2.5 py-2">
                    <Checkbox
                        checked={formField.value}
                        onCheckedChange={formField.onChange}
                        id={field.id}
                        aria-label={field.label}
                    />
                    <label
                        htmlFor={field.id}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                        {field.label}
                        {field.required && (
                            <span className="text-destructive ml-1" aria-hidden="true">
                                *
                            </span>
                        )}
                    </label>
                </div>
            );

        default:
            return (
                <Input
                    {...formField}
                    placeholder={field.placeholder}
                    aria-label={field.label}
                />
            );
    }
}
