"use client";

import { useState, useTransition } from "react";
import { CheckCircle } from "lucide-react";
import { FormRenderer } from "@/components/forms/form-renderer";
import { submitFormResponse } from "@/lib/actions/form-actions";
import { toast } from "@/lib/toast";
import type { Form } from "@/types/form-types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

interface PublicFormClientProps {
    form: Form;
}

export function PublicFormClient({ form }: PublicFormClientProps) {
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isPending, startTransition] = useTransition();
    const t = useTranslations("Public.Form");

    const handleSubmit = async (data: Record<string, unknown>) => {
        startTransition(async () => {
            const result = await submitFormResponse(form.id, data);

            if (result.error) {
                toast.error(result.error);
                return;
            }

            setIsSubmitted(true);
        });
    };

    if (isSubmitted) {
        return (
            <div className="min-h-[100dvh] flex items-center justify-center p-4 bg-muted/30">
                <Card className="w-full max-w-md text-center">
                    <CardContent className="pt-8 pb-8">
                        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                        <CardTitle className="mb-2">{t("thankYou")}</CardTitle>
                        <CardDescription className="mb-6">
                            {t("responseRecorded")}
                        </CardDescription>
                        <Button
                            variant="outline"
                            onClick={() => setIsSubmitted(false)}
                        >
                            {t("submitAnotherResponse")}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-[100dvh] py-8 px-4 bg-muted/30">
            <div className="max-w-2xl mx-auto">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl">{form.title}</CardTitle>
                        {form.description && (
                            <CardDescription className="text-base">
                                {form.description}
                            </CardDescription>
                        )}
                    </CardHeader>
                    <CardContent>
                        <FormRenderer
                            schema={form.schema}
                            onSubmit={handleSubmit}
                            submitButtonText={isPending ? t("submitting") : t("submit")}
                        />
                    </CardContent>
                </Card>

                {/* Footer */}
                <p className="text-center text-xs text-muted-foreground mt-6">
                    {t("poweredBy")}
                </p>
            </div>
        </div>
    );
}
