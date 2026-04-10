"use client";

import { Suspense, use, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { MeetingBuilder } from "@/components/meetings/builder";
import { toast } from "@/lib/toast";

function MeetingBuilderContent({ meetingId }: { meetingId: string }) {
    const searchParams = useSearchParams();

    useEffect(() => {
        if (searchParams.get("setup") !== "plan") return;
        toast.info("Next step: choose a plan", {
            description: "In Plan Layer, select Agenda for collaboration or Program for conducting.",
        });
    }, [searchParams]);

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
