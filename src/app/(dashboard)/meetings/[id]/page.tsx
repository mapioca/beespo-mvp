import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { MeetingDetailContent } from "@/components/meetings/meeting-detail-content";

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

    // Check if this user has Zoom connected and read the stored plan type
    const { data: zoomApp } = await (supabase as ReturnType<typeof supabase.from>)
        .from("apps")
        .select("id")
        .eq("slug", "zoom")
        .single();
    const { data: zoomToken } = await (supabase as ReturnType<typeof supabase.from>)
        .from("app_tokens")
        .select("zoom_plan_type")
        .eq("user_id", user?.id ?? "")
        .eq("app_id", zoomApp?.id ?? "")
        .maybeSingle();
    const isZoomConnected = zoomToken !== null;
    // 1 = Basic (Free), 2+ = Licensed (Paid), null = unknown (scope not yet granted)
    const zoomPlanType: number | null = zoomToken?.zoom_plan_type ?? null;
    const isZoomFreeAccount: boolean | null =
        zoomPlanType === 1 ? true : zoomPlanType !== null ? false : null;

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
        <MeetingDetailContent
            meeting={meeting}
            agendaItems={agendaItems || []}
            workspaceSlug={workspaceSlug}
            isLeader={isLeader}
            totalDuration={totalDuration}
            currentUserName={profile?.full_name || ""}
            isZoomConnected={isZoomConnected}
            isZoomFreeAccount={isZoomFreeAccount}
        />
    );
}
