import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { formatMeetingDateTime } from "@/lib/meeting-helpers";
import { MeetingStatusBadge } from "@/components/meetings/meeting-status-badge";
import { AgendaItemList } from "@/components/meetings/agenda-item-list";
import { MeetingDashboardActions } from "@/components/meetings/meeting-dashboard-actions";
import { LinkedNotesList } from "@/components/notes/linked-notes-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Clock, CalendarDays, User } from "lucide-react";
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
        .select("role, full_name")
        .eq("id", user?.id || "")
        .single();

    const isLeader = profile?.role === "leader";

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
        .select("*")
        .eq("meeting_id", id)
        .order("order_index", { ascending: true });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const totalDuration = agendaItems?.reduce((acc: number, item: any) => acc + (item.duration_minutes || 0), 0) || 0;

    return (
        <div className="flex flex-col gap-8 p-8 max-w-5xl mx-auto">
            {/* Header / Nav */}
            <div className="flex items-center gap-4 text-muted-foreground">
                <Button variant="ghost" size="sm" asChild className="-ml-2">
                    <Link href="/meetings">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Meetings
                    </Link>
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
                <div className="space-y-6">
                    {/* Main Title Area */}
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-3xl font-bold tracking-tight">{meeting.title}</h1>
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

                {/* Sidebar */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Actions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <MeetingDashboardActions meeting={meeting} isLeader={isLeader} />
                        </CardContent>
                    </Card>

                    <LinkedNotesList entityId={id} entityType="meeting" />

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                            <div>
                                <span className="text-muted-foreground block text-xs uppercase tracking-wider font-semibold mb-1">Formatted From</span>
                                <div className="font-medium">
                                    {meeting.templates?.name || "No Template (Blank)"}
                                </div>
                            </div>
                            <div>
                                <span className="text-muted-foreground block text-xs uppercase tracking-wider font-semibold mb-1">Created By</span>
                                <div className="flex items-center gap-2">
                                    <User className="w-3 h-3" />
                                    {meeting.profiles?.full_name || "Unknown"}
                                </div>
                            </div>
                            <div>
                                <span className="text-muted-foreground block text-xs uppercase tracking-wider font-semibold mb-1">Meeting ID</span>
                                <code className="text-xs bg-muted px-1 py-0.5 rounded">{meeting.id.slice(0, 8)}...</code>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
