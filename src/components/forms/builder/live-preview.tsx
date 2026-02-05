"use client";

import { useMemo } from "react";
import { FormRenderer } from "@/components/forms/form-renderer";
import type { FormSchema } from "@/types/form-types";
import type { BuilderField } from "./types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface LivePreviewProps {
    title: string;
    description: string;
    fields: BuilderField[];
}

export function LivePreview({ title, description, fields }: LivePreviewProps) {
    // Convert builder fields to FormSchema
    const schema: FormSchema = useMemo(
        () => ({
            id: "preview",
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
        }),
        [title, description, fields]
    );

    // Mock submit handler for preview
    const handlePreviewSubmit = async () => {
        // Preview mode - don't actually submit
    };

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="text-lg">Live Preview</CardTitle>
                <CardDescription>
                    See how your form will appear to respondents
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="border rounded-lg p-6 bg-background min-h-[400px]">
                    {/* Form Header */}
                    <div className="mb-6">
                        <h2 className="text-xl font-semibold">
                            {title || "Untitled Form"}
                        </h2>
                        {description && (
                            <p className="text-muted-foreground mt-1">{description}</p>
                        )}
                    </div>

                    {/* Form Content */}
                    {fields.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <p>Add fields to see them here</p>
                        </div>
                    ) : (
                        <FormRenderer
                            schema={schema}
                            onSubmit={handlePreviewSubmit}
                            submitButtonText="Submit"
                            isPreview={true}
                        />
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
