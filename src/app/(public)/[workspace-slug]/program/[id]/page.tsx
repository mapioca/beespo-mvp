import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ProgramView } from "@/components/meetings/program/program-view";
import { mapAgendaToProgramItems } from "@/lib/map-agenda-to-program-items";
import type { ProgramViewData } from "@/components/meetings/program/types";
import type { Database } from "@/types/database";
import {
    buildProgramStyleVars,
    filterProgramItems,
    getProgramContentWidthClass,
    normalizeProgramStyleSettings,
} from "@/components/meetings/program/program-style";
import type { ProgramStyleSettings } from "@/components/meetings/program/program-style";

export const dynamic = "force-dynamic";

type Meeting = Database["public"]["Tables"]["meetings"]["Row"];

interface ProgramPageProps {
    params: Promise<{
        "workspace-slug": string;
        id: string;
    }>;
}

interface MeetingData extends Meeting {
    workspaces: { slug: string | null; name: string | null };
}

export async function generateMetadata({ params }: ProgramPageProps): Promise<Metadata> {
    const { id: meetingId } = await params;
    const supabase = await createClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: meeting } = await (supabase.from("meetings") as any)
        .select("title")
        .eq("id", meetingId)
        .eq("is_publicly_shared", true)
        .single();

    return {
        title: meeting?.title ? `${meeting.title} — Program` : "Program",
        robots: { index: false, follow: false },
    };
}

export default async function ProgramPage({ params }: ProgramPageProps) {
    const { "workspace-slug": workspaceSlug, id: meetingId } = await params;
    const supabase = await createClient();

    // Fetch meeting with workspace verification
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: meeting, error: meetingError } = await (supabase.from("meetings") as any)
        .select(`
            *,
            workspaces!inner(slug, name)
        `)
        .eq("id", meetingId)
        .eq("is_publicly_shared", true)
        .single() as { data: MeetingData | null; error: unknown };

    if (meetingError || !meeting) {
        notFound();
    }

    // Verify workspace slug matches
    if (meeting.workspaces?.slug !== workspaceSlug) {
        notFound();
    }

    // Fetch agenda items with hymn data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: agendaItems } = await (supabase.from("agenda_items") as any)
        .select(`
            *,
            hymn:hymns(title, hymn_number),
            child_items
        `)
        .eq("meeting_id", meetingId)
        .order("order_index", { ascending: true });

    if (!agendaItems || agendaItems.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center text-muted-foreground">
                    <p className="text-lg font-medium">No Program Available</p>
                    <p className="text-sm mt-1">This meeting does not have an agenda yet.</p>
                </div>
            </div>
        );
    }

    const scheduledDate = new Date(meeting.scheduled_date);

    const programData: ProgramViewData = {
        title: meeting.title || "Untitled Meeting",
        date: scheduledDate,
        time: scheduledDate.toTimeString().slice(0, 5),
        unitName: meeting.workspaces?.name || undefined,
        roles: {
            presiding: meeting.presiding_name || undefined,
            conducting: meeting.conducting_name || undefined,
            chorister: meeting.chorister_name || undefined,
            pianistOrganist: meeting.organist_name || undefined,
        },
        items: mapAgendaToProgramItems(agendaItems),
        meetingNotes: typeof meeting.notes === "string" ? meeting.notes : undefined,
    };
    const normalizedStyle = normalizeProgramStyleSettings(meeting.program_style as ProgramStyleSettings | null);
    const programStyle = buildProgramStyleVars(normalizedStyle);
    const contentWidthClass = getProgramContentWidthClass(normalizedStyle);
    const filteredItems = filterProgramItems(programData.items, normalizedStyle);

    return (
        <div className="flex-1 flex justify-center bg-transparent py-6" style={programStyle}>
            <ProgramView
                data={{ ...programData, items: filteredItems }}
                variant="embedded"
                density={normalizedStyle.density}
                viewStyle={normalizedStyle.viewStyle}
                showDivider
            showRoles={normalizedStyle.showRoles}
            showFooter={normalizedStyle.showFooter}
            showMeetingNotes={normalizedStyle.showMeetingNotes}
                showSpeakerNames={normalizedStyle.showSpeakerNames}
                showDurations={normalizedStyle.showDurations}
                showIcons={normalizedStyle.showIcons}
                dateFormat={normalizedStyle.dateFormat}
                titleCase={normalizedStyle.titleCase}
                className={contentWidthClass}
            />
        </div>
    );
}
