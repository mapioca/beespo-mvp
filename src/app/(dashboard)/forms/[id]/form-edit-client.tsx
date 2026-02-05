"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Share2, BarChart2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FormBuilder } from "@/components/forms/builder/form-builder";
import { ShareFormModal } from "@/components/forms/share-form-modal";
import { updateForm } from "@/lib/actions/form-actions";
import { toast } from "sonner";
import type { Form, FormSchema } from "@/types/form-types";
import type { BuilderField } from "@/components/forms/builder/types";

interface FormEditClientProps {
    form: Form;
    submissionCount: number;
    workspaceSlug?: string;
}

export function FormEditClient({
    form,
    submissionCount,
    workspaceSlug,
}: FormEditClientProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [isSaving, setIsSaving] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [currentForm, setCurrentForm] = useState(form);

    // Convert schema fields to builder fields
    const initialFields: BuilderField[] = (form.schema.fields || []).map((field) => ({
        id: field.id,
        type: field.type,
        label: field.label,
        placeholder: field.placeholder || "",
        required: field.required,
        options: field.options || [],
    }));

    const handleSave = async (data: {
        title: string;
        description: string;
        schema: FormSchema;
    }) => {
        setIsSaving(true);
        startTransition(async () => {
            const result = await updateForm(form.id, {
                title: data.title,
                description: data.description,
                schema: data.schema,
            });

            if (result.error) {
                toast.error(result.error);
                setIsSaving(false);
                return;
            }

            toast.success("Form saved successfully");
            setIsSaving(false);
            if (result.data) {
                setCurrentForm(result.data);
            }
            router.refresh();
        });
    };

    const handlePublishToggle = async () => {
        setIsPublishing(true);
        startTransition(async () => {
            const result = await updateForm(form.id, {
                is_published: !currentForm.is_published,
            });

            if (result.error) {
                toast.error(result.error);
                setIsPublishing(false);
                return;
            }

            setIsPublishing(false);
            if (result.data) {
                setCurrentForm(result.data);
                toast.success(
                    result.data.is_published
                        ? "Form published! It's now accepting responses."
                        : "Form unpublished. It's no longer accepting responses."
                );
            }
            router.refresh();
        });
    };

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Header */}
            <div className="border-b px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/forms">
                            <ArrowLeft className="h-4 w-4" />
                            <span className="sr-only">Back to forms</span>
                        </Link>
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-semibold">{currentForm.title}</h1>
                            <Badge variant={currentForm.is_published ? "default" : "secondary"}>
                                {currentForm.is_published ? "Published" : "Draft"}
                            </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {submissionCount} response{submissionCount !== 1 ? "s" : ""}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={handlePublishToggle}
                        disabled={isPublishing}
                    >
                        {currentForm.is_published ? (
                            <>
                                <EyeOff className="h-4 w-4 mr-2" />
                                Unpublish
                            </>
                        ) : (
                            <>
                                <Eye className="h-4 w-4 mr-2" />
                                Publish
                            </>
                        )}
                    </Button>
                    {currentForm.is_published && (
                        <Button variant="outline" onClick={() => setShowShareModal(true)}>
                            <Share2 className="h-4 w-4 mr-2" />
                            Share
                        </Button>
                    )}
                    <Button variant="outline" asChild>
                        <Link href={`/forms/${form.id}/results`}>
                            <BarChart2 className="h-4 w-4 mr-2" />
                            Results
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Builder */}
            <div className="flex-1 overflow-auto p-6">
                <FormBuilder
                    initialTitle={form.title}
                    initialDescription={form.description || ""}
                    initialFields={initialFields}
                    onSave={handleSave}
                    isSaving={isSaving || isPending}
                />
            </div>

            {/* Share Modal */}
            <ShareFormModal
                open={showShareModal}
                onOpenChange={setShowShareModal}
                form={currentForm}
                workspaceSlug={workspaceSlug}
            />
        </div>
    );
}
