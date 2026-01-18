"use client";

import { useState } from "react";
import { Play, Download, Edit, StopCircle, RotateCcw, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { pdf } from "@react-pdf/renderer";
import { Button } from "@/components/ui/button";
import { ShareDialog } from "@/components/conduct/share-dialog";
import { MeetingAgendaPDF, getMeetingPDFFilename } from "@/components/meetings/meeting-agenda-pdf";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/lib/hooks/use-toast";
import { Database } from "@/types/database";

type Meeting = Database["public"]["Tables"]["meetings"]["Row"] & {
    templates?: { name: string } | null;
};
type AgendaItem = Database["public"]["Tables"]["agenda_items"]["Row"] & {
    hymn?: { title: string; hymn_number: number } | null;
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
    const { toast } = useToast();
    const [isStatusLoading, setIsStatusLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [currentMeeting, setCurrentMeeting] = useState(meeting);

    const handleStatusChange = async (newStatus: Meeting["status"]) => {
        setIsStatusLoading(true);
        const supabase = createClient();
        const { error } = await (
            supabase.from("meetings") as ReturnType<typeof supabase.from>
        )
            .update({ status: newStatus })
            .eq("id", meeting.id);

        if (error) {
            toast({
                title: "Error",
                description: "Failed to update meeting status",
                variant: "destructive",
            });
        } else {
            router.refresh();
            toast({
                title: "Status updated",
                description: `Meeting marked as ${newStatus}`,
            });
        }
        setIsStatusLoading(false);
    };

    const handleDownload = async () => {
        setIsDownloading(true);
        try {
            const blob = await pdf(
                <MeetingAgendaPDF meeting={currentMeeting} agendaItems={agendaItems} />
            ).toBlob();

            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = getMeetingPDFFilename(currentMeeting);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast({
                title: "Download started",
                description: "Your PDF is being downloaded",
            });
        } catch (error) {
            console.error("PDF generation failed:", error);
            toast({
                title: "Download failed",
                description: "Could not generate PDF. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsDownloading(false);
        }
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

                {/* Download - Secondary/Outline */}
                <Button
                    variant="outline"
                    size="icon"
                    onClick={handleDownload}
                    disabled={isDownloading}
                    title="Download PDF"
                    className="shrink-0"
                >
                    {isDownloading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Download className="w-4 h-4" />
                    )}
                </Button>
            </div>

            {/* Status-specific actions */}
            {isLeader && (
                <div className="flex gap-2">
                    {meeting.status === "scheduled" && (
                        <Button asChild variant="outline" className="flex-1" size="sm">
                            <Link href={`/meetings/${meeting.id}/edit`}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit Agenda
                            </Link>
                        </Button>
                    )}

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
