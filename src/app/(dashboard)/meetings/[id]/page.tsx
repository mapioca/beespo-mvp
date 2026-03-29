"use client";

import { Suspense, use } from "react";
import { Loader2 } from "lucide-react";
import { MeetingBuilder } from "@/components/meetings/builder";

function MeetingBuilderContent({ meetingId }: { meetingId: string }) {
    return <MeetingBuilder initialMeetingId={meetingId} />;
}

export default function MeetingPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);

    return (
        <Suspense
            fallback={
                <div className="h-screen flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            }
        >
            <MeetingBuilderContent meetingId={id} />
        </Suspense>
    );
}
