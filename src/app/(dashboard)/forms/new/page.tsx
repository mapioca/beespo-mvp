"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FormBuilder } from "@/components/forms/builder/form-builder";
import { createForm } from "@/lib/actions/form-actions";
import { toast } from "sonner";
import type { FormSchema } from "@/types/form-types";

export default function NewFormPage() {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async (data: {
        title: string;
        description: string;
        schema: FormSchema;
    }) => {
        setIsSaving(true);
        startTransition(async () => {
            const result = await createForm({
                title: data.title,
                description: data.description,
                schema: data.schema,
            });

            if (result.error) {
                toast.error(result.error);
                setIsSaving(false);
                return;
            }

            toast.success("Form created successfully");
            router.push(`/forms/${result.data?.id}`);
        });
    };

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Header */}
            <div className="border-b px-6 py-4 flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/forms">
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">Back to forms</span>
                    </Link>
                </Button>
                <div>
                    <h1 className="text-xl font-semibold">Create New Form</h1>
                    <p className="text-sm text-muted-foreground">
                        Design your form and add fields
                    </p>
                </div>
            </div>

            {/* Builder */}
            <div className="flex-1 overflow-auto p-6">
                <FormBuilder
                    onSave={handleSave}
                    isSaving={isSaving || isPending}
                />
            </div>
        </div>
    );
}
