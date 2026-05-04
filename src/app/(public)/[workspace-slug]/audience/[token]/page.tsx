import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import {
    type AudienceMeeting,
    type AudienceAgendaEntry,
    type AudienceMeetingSpecialType,
} from "@/components/audience/audience-program";
import { PublicAudienceView } from "./public-audience-view";

interface PublicAudiencePageProps {
    params: Promise<{
        "workspace-slug": string;
        token: string;
    }>;
}

export const metadata: Metadata = {
    title: "Audience",
    robots: {
        index: false,
        follow: false,
        googleBot: { index: false, follow: false },
    },
};

export const dynamic = "force-dynamic";

type PlannerMeetingState = {
    title?: string;
    specialType?: AudienceMeetingSpecialType;
    assignments?: Record<string, string>;
    standardEntries?: AudienceAgendaEntry[];
    fastEntries?: AudienceAgendaEntry[];
};

function buildAudienceMeeting(
    raw: unknown,
): AudienceMeeting | null {
    if (!raw || typeof raw !== "object") return null;
    const state = raw as PlannerMeetingState;
    const specialType: AudienceMeetingSpecialType = state.specialType ?? "standard";

    const entries =
        specialType === "fast-testimony"
            ? (state.fastEntries ?? [])
            : (state.standardEntries ?? []);

    const assignments = {
        presiding: state.assignments?.presiding ?? "",
        conductor: state.assignments?.conductor ?? "",
        chorister: state.assignments?.chorister ?? "",
        accompanist: state.assignments?.accompanist ?? "",
    };

    return {
        title: state.title,
        specialType,
        assignments,
        entries,
    };
}

export default async function PublicAudiencePage({ params }: PublicAudiencePageProps) {
    const { "workspace-slug": workspaceSlug, token } = await params;
    const supabase = createAdminClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: link } = await (supabase.from("workspace_audience_links") as any)
        .select("workspace_id")
        .eq("token", token)
        .maybeSingle();

    if (!link?.workspace_id) {
        notFound();
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: workspace } = await (supabase.from("workspaces") as any)
        .select("name, slug, unit_name")
        .eq("id", link.workspace_id)
        .single();

    if (!workspace || workspace.slug !== workspaceSlug) {
        notFound();
    }

    const nowIso = new Date().toISOString();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: entry } = await (supabase.from("sacrament_planner_entries") as any)
        .select("meeting_date, meeting_state, audience_published_at")
        .eq("workspace_id", link.workspace_id)
        .not("audience_published_at", "is", null)
        .lte("audience_published_at", nowIso)
        .order("audience_published_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    const unitName: string = workspace.unit_name || workspace.name || "";

    if (!entry) {
        return <PublicAudienceView unitName={unitName} meeting={null} isoDate={null} />;
    }

    const meeting = buildAudienceMeeting(entry.meeting_state);

    return (
        <PublicAudienceView
            unitName={unitName}
            meeting={meeting}
            isoDate={entry.meeting_date as string}
        />
    );
}
