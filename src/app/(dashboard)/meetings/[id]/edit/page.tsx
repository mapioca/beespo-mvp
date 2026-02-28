"use client";

import { Suspense, use } from "react";
import { Loader2 } from "lucide-react";
import { MeetingBuilder } from "@/components/meetings/builder";

function EditMeetingBuilderContent({ meetingId }: { meetingId: string }) {
    return <MeetingBuilder initialMeetingId={meetingId} />;
}

export default function EditMeetingPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);

    return (
        <Suspense
            fallback={
                <div className="h-screen flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            }
        >
            <EditMeetingBuilderContent meetingId={id} />
        </Suspense>
    );
}
