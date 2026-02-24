"use client";

import { useState } from "react";
import { Play, Eye, StopCircle, RotateCcw, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ShareDialog } from "@/components/conduct/share-dialog";
import { generateMeetingMarkdown } from "@/lib/generate-meeting-markdown";
import { PreviewModal } from "@/components/meetings/preview-modal";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";
import { Database } from "@/types/database";

type Meeting = Database["public"]["Tables"]["meetings"]["Row"] & {
    templates?: { name: string } | null;
};
type AgendaItem = Database["public"]["Tables"]["agenda_items"]["Row"] & {
    hymn?: { title: string; hymn_number: number } | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    child_items?: any[] | null;
};

interface ActionToolbarProps {
    meeting: Meeting;
    agendaItems: AgendaItem[];
    workspaceSlug: string | null;
    isLeader: boolean;
    onMeetingUpdate?: (meeting: Meeting) => void;
}

export function ActionToolbar({
    meeting,
    agendaItems,
    workspaceSlug,
    isLeader,
    onMeetingUpdate,
}: ActionToolbarProps) {
    const router = useRouter();
    const [isStatusLoading, setIsStatusLoading] = useState(false);
    const [currentMeeting, setCurrentMeeting] = useState(meeting);

    // Preview state
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
    const [previewMarkdown, setPreviewMarkdown] = useState("");

    const handleStatusChange = async (newStatus: Meeting["status"]) => {
        setIsStatusLoading(true);
        const supabase = createClient();
        const { error } = await (
            supabase.from("meetings") as ReturnType<typeof supabase.from>
        )
            .update({ status: newStatus })
            .eq("id", meeting.id);

        if (error) {
            toast.error("Failed to update meeting status");
        } else {
            router.refresh();
            toast.success("Status updated", { description: `Meeting marked as ${newStatus}` });
        }
        setIsStatusLoading(false);
    };

    const handlePreview = () => {
        setIsPreviewOpen(true);
        setIsGeneratingPreview(true);

        setTimeout(() => {
            try {
                // Map DB agenda items to CanvasItem format for markdown generation
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const canvasItems: any[] = agendaItems.map((item) => ({
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
                    title: currentMeeting.title || "Untitled Meeting",
                    date: new Date(currentMeeting.scheduled_date),
                    time: new Date(currentMeeting.scheduled_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    // DB doesn't store these separate roles directly on meeting object in this branch,
                    // so we omit them or extract them if we add them to the DB schema later.
                    canvasItems: canvasItems,
                });

                setPreviewMarkdown(markdown);
            } catch (err) {
                console.error("Failed to generate preview:", err);
                toast.error("Preview failed", { description: "Could not generate agenda preview." });
            } finally {
                setIsGeneratingPreview(false);
            }
        }, 50);
    };

    const handleMeetingUpdate = (updatedMeeting: Meeting) => {
        setCurrentMeeting(updatedMeeting);
        onMeetingUpdate?.(updatedMeeting);
    };

    const showConductButton =
        meeting.status === "scheduled" || meeting.status === "in_progress";

    return (
        <div className="space-y-3">
            {/* Primary Actions Row - Conduct, Share, Download */}
            <div className="flex items-center gap-2">
                {/* Conduct - Primary CTA */}
                {showConductButton && (
                    <>
                        {meeting.status === "scheduled" && isLeader ? (
                            <Button
                                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-sm"
                                onClick={() => handleStatusChange("in_progress")}
                                disabled={isStatusLoading}
                            >
                                {isStatusLoading ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Play className="w-4 h-4 mr-2" />
                                )}
                                Conduct
                            </Button>
                        ) : meeting.status === "in_progress" ? (
                            <Button
                                asChild
                                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-sm"
                            >
                                <Link href={`/meetings/${meeting.id}/conduct`}>
                                    <Play className="w-4 h-4 mr-2" />
                                    Conduct
                                </Link>
                            </Button>
                        ) : null}
                    </>
                )}

                {/* Share - Secondary/Outline */}
                <ShareDialog
                    meeting={currentMeeting}
                    workspaceSlug={workspaceSlug}
                    onUpdate={handleMeetingUpdate}
                />

                {/* Preview - Secondary/Outline */}
                <Button
                    variant="outline"
                    size="icon"
                    onClick={handlePreview}
                    title="Preview Agenda"
                    className="shrink-0"
                >
                    <Eye className="w-4 h-4" />
                </Button>
            </div>

            <PreviewModal
                open={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
                markdown={previewMarkdown}
                isLoading={isGeneratingPreview}
                meetingId={meeting.id}
            />

            {/* Status-specific actions */}
            {isLeader && (
                <div className="flex gap-2">
                    {meeting.status === "in_progress" && (
                        <Button
                            variant="outline"
                            className="flex-1"
                            size="sm"
                            onClick={() => handleStatusChange("completed")}
                            disabled={isStatusLoading}
                        >
                            {isStatusLoading ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <StopCircle className="w-4 h-4 mr-2" />
                            )}
                            End Meeting
                        </Button>
                    )}

                    {meeting.status === "completed" && (
                        <Button
                            variant="outline"
                            className="flex-1"
                            size="sm"
                            onClick={() => handleStatusChange("scheduled")}
                            disabled={isStatusLoading}
                        >
                            {isStatusLoading ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <RotateCcw className="w-4 h-4 mr-2" />
                            )}
                            Reopen
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}
