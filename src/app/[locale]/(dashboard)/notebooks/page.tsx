"use client";

import { Suspense } from "react";
import { NotebookLibrary } from "@/components/notebooks/notebook-library";

function NotebooksPageContent() {
    return <NotebookLibrary />;
}

export default function NotebooksPage() {
    return (
        <Suspense
            fallback={
                <div className="flex items-center justify-center h-full">
                    <div className="text-muted-foreground">Loading notebooks...</div>
                </div>
            }
        >
            <NotebooksPageContent />
        </Suspense>
    );
}
