import { Suspense } from "react";
import { NotebookLibrary } from "@/components/notebooks/notebook-library";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Metadata.notebooks" });

    return {
        title: t("title"),
        description: t("description"),
    };
}

export default async function NotebooksPage() {
    const t = await getTranslations("Dashboard.Notebooks");

    return (
        <Suspense
            fallback={
                <div className="flex items-center justify-center h-full">
                    <div className="text-muted-foreground">{t("loadingNotebooks")}</div>
                </div>
            }
        >
            <NotebookLibrary />
        </Suspense>
    );
}
