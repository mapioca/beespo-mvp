import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { MeetingDetailContent } from "@/components/meetings/meeting-detail-content";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface MeetingDetailPageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function MeetingDetailPage({ params }: MeetingDetailPageProps) {
    const { id } = await params;
    const supabase = await createClient();

    // Get current user profile
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await (supabase
        .from("profiles") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select("role, full_name, workspace_id")
        .eq("id", user?.id || "")
        .single();

    const isLeader = profile?.role === "leader";

    // Fetch meeting details with workspace for slug
    const { data: meeting, error } = await (supabase
        .from("meetings") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select(`
            *,
            templates (name),
            profiles (full_name),
            workspaces!inner(slug)
        `)
        .eq("id", id)
        .single();

    if (error || !meeting) {
        notFound();
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const workspaceSlug = (meeting.workspaces as any)?.slug || null;

    // Fetch agenda items with hymn data for PDF generation and editing
    const { data: agendaItems } = await (supabase
        .from("agenda_items") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select(`
            *,
            hymn:hymns(title, hymn_number)
        `)
        .eq("meeting_id", id)
        .order("order_index", { ascending: true });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const totalDuration = agendaItems?.reduce((acc: number, item: any) => acc + (item.duration_minutes || 0), 0) || 0;

    return (
        <div className="flex flex-col gap-6 p-6 lg:p-8 max-w-6xl mx-auto">
            {/* Header / Nav */}
            <div className="flex items-center gap-4 text-muted-foreground">
                <Button variant="ghost" size="sm" asChild className="-ml-2">
                    <Link href="/meetings">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Meetings
                    </Link>
                </Button>
            </div>

            {/* Client Component for Interactive Content */}
            <MeetingDetailContent
                meeting={meeting}
                agendaItems={agendaItems || []}
                workspaceSlug={workspaceSlug}
                isLeader={isLeader}
                totalDuration={totalDuration}
            />
        </div>
    );
}
