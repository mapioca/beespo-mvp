import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Breadcrumbs } from "@/components/dashboard/breadcrumbs";
import { MeetingPlanSetup } from "@/components/meetings/meeting-plan-setup";
import { MeetingDetailsPageClient } from "@/components/meetings/meeting-details-page-client";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ id: string }>;
}): Promise<Metadata> {
    const { id } = await params;
    const supabase = await createClient();
    const { data } = await (supabase.from("meetings") as ReturnType<typeof supabase.from>)
        .select("title")
        .eq("id", id)
        .single();
    const title = (data as { title?: string } | null)?.title ?? "Meeting";
    return { title: `${title} | Beespo` };
}

export default async function MeetingPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{
        setup?: string;
        created?: string;
        announcement?: string;
        templates?: string;
    }>;
}) {
    const { id } = await params;
    const query = await searchParams;
    const supabase = await createClient();

    const { data: meeting, error } = await (supabase.from("meetings") as ReturnType<typeof supabase.from>)
        .select(`
            *,
            event:events!event_id (
                id,
                title,
                start_at,
                end_at,
                location,
                workspace_event_id
            )
        `)
        .eq("id", id)
        .single();

    if (error || !meeting) notFound();

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

    const { event, ...meetingRow } = meeting as typeof meeting & {
        event?: {
            id: string;
            title: string;
            start_at: string | null;
            end_at: string | null;
            location: string | null;
            workspace_event_id: string | null;
        } | null;
    };

    return (
        <div className="flex h-full min-h-0 flex-col">
            <Breadcrumbs
                items={[
                    { label: "Meetings", href: "/meetings/overview" },
                    { label: meetingRow.title ?? "Meeting" },
                ]}
            />
            <MeetingDetailsPageClient
                meeting={meetingRow}
                event={event ?? null}
            />
        </div>
    );
}
