"use client";

import { Suspense } from "react";
import { NotebookLibrary } from "@/components/notebooks/notebook-library";
import { useTranslations } from "next-intl";

function NotebooksPageContent() {
    return <NotebookLibrary />;
}

export default function NotebooksPage() {
    const t = useTranslations("Dashboard.Notebooks");

    return (
        <Suspense
            fallback={
                <div className="flex items-center justify-center h-full">
                    <div className="text-muted-foreground">{t("loadingNotebooks")}</div>
                </div>
            }
        >
            <NotebooksPageContent />
        </Suspense>
    );
}
