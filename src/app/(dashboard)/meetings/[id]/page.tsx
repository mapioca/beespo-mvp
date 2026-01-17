import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { formatMeetingDateTime } from "@/lib/meeting-helpers";
import { MeetingStatusBadge } from "@/components/meetings/meeting-status-badge";
import { AgendaItemList } from "@/components/meetings/agenda-item-list";
import { MeetingSidebar } from "@/components/meetings/sidebar";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Clock, CalendarDays } from "lucide-react";
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

    // Fetch agenda items with hymn data for PDF generation
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

            {/* Main Layout - Sidebar on right */}
            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                {/* Main Content Area */}
                <div className="space-y-6 min-w-0">
                    {/* Title Section */}
                    <div>
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">{meeting.title}</h1>
                            <MeetingStatusBadge status={meeting.status} />
                        </div>
                        <p className="text-muted-foreground flex items-center gap-2">
                            <CalendarDays className="w-4 h-4" />
                            {formatMeetingDateTime(meeting.scheduled_date)}
                        </p>
                    </div>

                    <Separator />

                    {/* Agenda Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold">Agenda</h2>
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>Total Est: {totalDuration} min</span>
                            </div>
                        </div>

                        <AgendaItemList items={agendaItems || []} showNotes={true} />
                    </div>
                </div>

                {/* Right Sidebar - Mobile: shows below content, Desktop: fixed width right column */}
                <div className="lg:sticky lg:top-6 lg:self-start">
                    <MeetingSidebar
                        meeting={meeting}
                        agendaItems={agendaItems || []}
                        workspaceSlug={workspaceSlug}
                        isLeader={isLeader}
                        totalDuration={totalDuration}
                    />
                </div>
            </div>
        </div>
    );
}
