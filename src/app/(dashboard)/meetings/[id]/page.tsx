import { notFound } from "next/navigation";
import { MeetingBuilder } from "@/components/meetings/builder";
import { MeetingPlanSetup } from "@/components/meetings/meeting-plan-setup";
import type { BuilderMode } from "@/components/meetings/builder";
import { createClient } from "@/lib/supabase/server";

function parseMode(mode: string | undefined): BuilderMode | undefined {
    if (mode === "planning" || mode === "print-preview" || mode === "program") {
        return mode;
    }
    return undefined;
}

export default async function MeetingPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{
        setup?: string;
        mode?: string;
        created?: string;
        announcement?: string;
        templates?: string;
    }>;
}) {
    const { id } = await params;
    const query = await searchParams;
    const supabase = await createClient();

    const { data: meeting } = await (supabase.from("meetings") as ReturnType<typeof supabase.from>)
        .select("id, title, plan_type")
        .eq("id", id)
        .single();

    if (!meeting) {
        notFound();
    }

    if (query.setup === "plan") {
        return (
            <MeetingPlanSetup
                meetingId={id}
                meetingTitle={meeting.title || "Untitled Meeting"}
                currentPlanType={meeting.plan_type as "agenda" | "program" | null}
                setupFeedback={{
                    created: query.created,
                    announcement: query.announcement === "1",
                    templates: Number.parseInt(query.templates ?? "0", 10) || 0,
                }}
            />
        );
    }

    const initialMode = parseMode(query.mode);
    return <MeetingBuilder initialMeetingId={id} initialMode={initialMode} />;
}
