"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { MeetingBuilder } from "@/components/meetings/builder";

function MeetingBuilderContent() {
    const searchParams = useSearchParams();
    const templateIdFromUrl = searchParams.get("templateId");

    return <MeetingBuilder initialTemplateId={templateIdFromUrl} />;
}

export default function CreateMeetingPage() {
    return (
        <Suspense
            fallback={
                <div className="h-screen flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            }
        >
            <MeetingBuilderContent />
        </Suspense>
    );
}
