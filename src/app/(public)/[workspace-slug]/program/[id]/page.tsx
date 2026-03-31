import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ProgramView } from "@/components/meetings/program/program-view";
import { mapAgendaToProgramItems } from "@/lib/map-agenda-to-program-items";
import type { ProgramViewData } from "@/components/meetings/program/types";
import type { Database } from "@/types/database";
import type { CSSProperties } from "react";

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
    };

    const programStyle = {
        "--program-text": "hsl(var(--foreground))",
        "--program-muted": "hsl(var(--muted-foreground))",
        "--program-subtle": "hsl(var(--muted-foreground))",
        "--program-border": "hsl(var(--border) / 0.6)",
        "--program-card": "hsl(var(--background))",
        "--program-soft": "hsl(var(--accent))",
        "--program-pill": "hsl(var(--pill))",
        "--program-pill-text": "hsl(var(--pill-foreground))",
        "--program-pill-bg": "hsl(var(--pill))",
        "--program-pill-border": "transparent",
        "--program-surface": "hsl(var(--paper))",
        "--program-radius": "14px",
        "--program-card-border": "hsl(var(--border) / 0.6)",
        "--program-card-shadow": "0 1px 0 rgba(15,23,42,0.04)",
        "--program-section-gap": "1.5rem",
        "--program-item-gap": "0.75rem",
        "--program-header-align": "center",
        "--program-header-justify": "center",
        "--program-icon-bg": "hsl(var(--accent))",
        "--program-icon-border": "transparent",
        "--program-title-weight": "600",
        "--program-card-padding-x": "0.75rem",
        "--program-card-padding-y": "0.6rem",
        "--program-icon-size": "1rem",
        "--program-icon-box": "1.75rem",
        "--program-border-width": "1.5px",
        "--program-line-height": "1.35",
        "--program-section-case": "uppercase",
        "--program-section-title-size": "0.78em",
        "--program-section-radius": "14px",
        "--program-subtitle-display": "block",
        "--program-card-border-style": "solid",
        "--program-divider-style": "solid",
        "--program-divider-weight": "1px",
        "--program-icons-display": "flex",
        "--program-title-size": "1.55em",
        fontSize: "14px",
    } as CSSProperties;

    return (
        <div className="flex-1 flex justify-center bg-panel py-10">
            <div
                className="bg-[color:var(--program-surface)] rounded-[32px] p-6"
                style={programStyle}
            >
                <div className="border border-[color:var(--program-border)] bg-[color:var(--program-surface)] rounded-[28px] p-4">
                    <ProgramView data={programData} variant="embedded" />
                </div>
            </div>
        </div>
    );
}
