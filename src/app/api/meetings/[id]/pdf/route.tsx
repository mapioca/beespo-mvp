import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateMeetingMarkdown } from "@/lib/generate-meeting-markdown";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { MeetingPDFDocument, parseMarkdownToSections } from "@/components/meetings/meeting-pdf-document";

export const dynamic = "force-dynamic";

// ── Route handler ─────────────────────────────────────────────────────────────
export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const supabase = await createClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: meeting, error } = await (supabase.from("meetings") as any)
        .select("*, templates(name), profiles(full_name)")
        .eq("id", id)
        .single();

    if (error || !meeting) {
        return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: agendaItems } = await (supabase.from("agenda_items") as any)
        .select("*, hymn:hymns(title, hymn_number), child_items")
        .eq("meeting_id", id)
        .order("order_index", { ascending: true });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const canvasItems: any[] = (agendaItems ?? []).map((item: any) => {
        const isSpeakerItem = item.item_type === "speaker";
        return {
            id: item.id,
            title: item.title,
            description: item.description,
            order_index: item.order_index,
            category: item.item_type,
            isContainer: ["discussion", "business", "announcement"].includes(item.item_type),
            containerType: ["discussion", "business", "announcement"].includes(item.item_type)
                ? item.item_type
                : undefined,
            childItems: item.child_items || [],
            is_hymn: !!item.hymn_id,
            hymn_number: item.hymn?.hymn_number,
            hymn_title: item.hymn?.title,
            // Speaker items: participant_name column stores the speaker's display name
            speaker_name: isSpeakerItem ? (item.participant_name || undefined) : undefined,
            // Participant items: non-speaker items that have a participant assigned
            requires_participant: !isSpeakerItem && !!item.participant_name,
            participant_name: !isSpeakerItem ? item.participant_name : undefined,
        };
    });

    const markdown = meeting.markdown_agenda || generateMeetingMarkdown({
        title: meeting.title || "Untitled Meeting",
        date: new Date(meeting.scheduled_date),
        time: new Date(meeting.scheduled_date).toTimeString().slice(0, 5),
        unitName: meeting.unit_name || "",
        presiding: meeting.presiding_name,
        conducting: meeting.conducting_name,
        chorister: meeting.chorister_name,
        pianistOrganist: meeting.organist_name,
        canvasItems,
    });

    const sections = parseMarkdownToSections(markdown);
    const safeTitle = (meeting.title || "agenda")
        .replace(/[^a-z0-9\s-]/gi, "")
        .replace(/\s+/g, "-")
        .toLowerCase();

    try {
        const pdfBuffer = await renderToBuffer(
            <MeetingPDFDocument sections={sections} meetingTitle={meeting.title || "Meeting Agenda"} />
        );

        return new NextResponse(new Uint8Array(pdfBuffer), {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${safeTitle}.pdf"`,
                "Cache-Control": "no-store",
            },
        });
    } catch (err) {
        console.error("PDF generation error:", err);
        return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
    }
}
