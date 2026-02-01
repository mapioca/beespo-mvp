"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { TemplateBuilderPage } from "@/components/templates/builder";

export default function NewTemplatePage() {
    return (
        <Suspense
            fallback={
                <div className="h-screen flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            }
        >
            <TemplateBuilderPage />
        </Suspense>
    );
}
