import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { MeetingDetailContent } from "@/components/meetings/meeting-detail-content";
import { Breadcrumbs } from "@/components/dashboard/breadcrumbs";
import { CalendarDays, ClipboardList, FileText } from "lucide-react";

// Force dynamic rendering to ensure fresh data on each request
export const dynamic = "force-dynamic";

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

    const isLeader = profile?.role === "leader" || profile?.role === "admin";

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

    // Fetch agenda items with hymn data and child_items for PDF generation and editing
    const { data: agendaItems } = await (supabase
        .from("agenda_items") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select(`
            *,
            hymn:hymns(title, hymn_number),
            child_items
        `)
        .eq("meeting_id", id)
        .order("order_index", { ascending: true });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const totalDuration = agendaItems?.reduce((acc: number, item: any) => acc + (item.duration_minutes || 0), 0) || 0;

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Breadcrumb */}
            <Breadcrumbs
                items={[
                    { label: "Meetings", href: "/meetings/agendas", icon: <CalendarDays className="h-3.5 w-3.5" /> },
                    { label: "Agendas", href: "/meetings/agendas", icon: <ClipboardList className="h-3.5 w-3.5" /> },
                    { label: meeting.title, icon: <FileText className="h-3.5 w-3.5" /> },
                ]}
            />

            {/* App Shell: Main Content + Sidebar - Takes remaining height */}
            <MeetingDetailContent
                meeting={meeting}
                agendaItems={agendaItems || []}
                workspaceSlug={workspaceSlug}
                isLeader={isLeader}
                totalDuration={totalDuration}
                currentUserName={profile?.full_name || ""}
            />
        </div>
    );
}
