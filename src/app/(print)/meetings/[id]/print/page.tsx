import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { generateMeetingMarkdown } from "@/lib/generate-meeting-markdown";
import { MarkdownRenderer } from "@/components/meetings/markdown-renderer";
import { PrintTrigger } from "./print-trigger";

export const dynamic = "force-dynamic";

interface PrintMeetingPageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function PrintMeetingPage({ params }: PrintMeetingPageProps) {
    const { id } = await params;
    const supabase = await createClient();

    // Fetch meeting details
    const { data: meeting, error } = await (supabase
        .from("meetings") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select(`
            *,
            templates (name),
            profiles (full_name)
        `)
        .eq("id", id)
        .single();

    if (error || !meeting) {
        notFound();
    }

    // Fetch agenda items
    const { data: agendaItems } = await (supabase
        .from("agenda_items") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select(`
            *,
            hymn:hymns(title, hymn_number),
            child_items
        `)
        .eq("meeting_id", id)
        .order("order_index", { ascending: true });

    if (!agendaItems || agendaItems.length === 0) {
        return (
            <div className="p-12 max-w-2xl mx-auto text-center mt-20">
                <h1 className="text-2xl font-bold mb-4">No Agenda Content</h1>
                <p className="text-gray-500">There is no agenda content available to print for this meeting.</p>
                <p className="text-sm mt-8 opacity-70">You can safely close this tab.</p>
            </div>
        );
    }

    // Map DB items to CanvasItem format for markdown generation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const canvasItems: any[] = agendaItems.map((item: any) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        order_index: item.order_index,
        category: item.item_type,
        // Map container specifically
        isContainer: ['discussion', 'business', 'announcement'].includes(item.item_type),
        containerType: ['discussion', 'business', 'announcement'].includes(item.item_type) ? item.item_type : undefined,
        childItems: item.child_items || [],
        // Map hymn
        is_hymn: !!item.hymn_id,
        hymn_number: item.hymn?.hymn_number,
        hymn_title: item.hymn?.title,
        // Map participants
        requires_participant: !!item.participant_name,
        participant_name: item.participant_name,
        speaker_name: item.participant_name, // Fallback for speaker category
    }));

    const markdown = generateMeetingMarkdown({
        title: meeting.title || "Untitled Meeting",
        date: new Date(meeting.scheduled_date),
        time: new Date(meeting.scheduled_date).toTimeString().slice(0, 5),
        unitName: meeting.unit_name || "",
        presiding: meeting.presiding_name,
        conducting: meeting.conducting_name,
        chorister: meeting.chorister_name,
        pianistOrganist: meeting.organist_name,
        canvasItems: canvasItems,
    });

    return (
        <div className="relative print:bg-white print:m-0 print:p-0">
            {/* Force browser print margins to match the PDF/preview layout */}
            <style>{`
                @page {
                    margin: 1in;
                }
            `}</style>

            {/* Action text for screen, hidden when printing */}
            <div className="print:hidden bg-blue-50 border-b border-blue-100 p-4 text-center text-sm text-blue-800">
                <p>Opening print dialog... Please close this tab after printing to return to the application.</p>
            </div>

            <main className="max-w-[850px] mx-auto p-12 sm:p-16 print:p-0 print:max-w-none">
                <MarkdownRenderer markdown={markdown} />
            </main>

            <PrintTrigger />
        </div>
    );
}
