"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { pdf } from "@react-pdf/renderer";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
    MoreHorizontal,
    Eye,
    Play,
    Download,
    Share2,
    Edit,
    Trash2,
    Loader2,
} from "lucide-react";
import { ShareDialog } from "@/components/conduct/share-dialog";
import { MeetingAgendaPDF, getMeetingPDFFilename } from "@/components/meetings/meeting-agenda-pdf";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";
import { Database } from "@/types/database";
import { useTranslations } from "next-intl";

type Meeting = Database["public"]["Tables"]["meetings"]["Row"] & {
    templates?: { name: string } | null;
};

interface MeetingRowActionsProps {
    meeting: Meeting;
    workspaceSlug: string | null;
    isLeader: boolean;
    onDelete?: (meetingId: string) => void;
}

export function MeetingRowActions({
    meeting,
    workspaceSlug,
    isLeader,
    onDelete,
}: MeetingRowActionsProps) {
    const t = useTranslations("Meetings.actions");
    const router = useRouter();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isShareOpen, setIsShareOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [currentMeeting, setCurrentMeeting] = useState(meeting);

    const handleDownload = async () => {
        setIsDownloading(true);
        try {
            // Fetch agenda items for the PDF
            const supabase = createClient();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: agendaItems } = await (supabase.from("agenda_items") as any)
                .select(`
                    *,
                    hymn:hymns(title, hymn_number)
                `)
                .eq("meeting_id", meeting.id)
                .order("order_index", { ascending: true });

            const blob = await pdf(
                <MeetingAgendaPDF
                    meeting={currentMeeting}
                    agendaItems={agendaItems || []}
                />
            ).toBlob();

            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = getMeetingPDFFilename(currentMeeting);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast.success(t("toast.downloadStarted"), { description: t("toast.downloadStartedDesc") });
        } catch (error) {
            console.error("PDF generation failed:", error);
            toast.error(t("toast.downloadFailed"), { description: t("toast.downloadFailedDesc") });
        } finally {
            setIsDownloading(false);
            setIsDropdownOpen(false);
        }
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const supabase = createClient();

            // Delete agenda items first (foreign key constraint)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase.from("agenda_items") as any)
                .delete()
                .eq("meeting_id", meeting.id);

            // Delete the meeting
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase.from("meetings") as any)
                .delete()
                .eq("id", meeting.id);

            if (error) throw error;

            toast.success(t("toast.deleteSuccess"), { description: t("toast.deleteSuccessDesc") });

            onDelete?.(meeting.id);
            router.refresh();
        } catch (error) {
            console.error("Delete failed:", error);
            toast.error(t("toast.deleteFailed"), { description: t("toast.deleteFailedDesc") });
        } finally {
            setIsDeleting(false);
            setIsDeleteDialogOpen(false);
        }
    };

    const handleMeetingUpdate = (updatedMeeting: Meeting) => {
        setCurrentMeeting(updatedMeeting);
    };

    const handleShareClick = () => {
        setIsDropdownOpen(false);
        setIsShareOpen(true);
    };

    return (
        <>
            <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">{t("openMenu")}</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[160px]">
                    {/* View - Always available */}
                    <DropdownMenuItem asChild>
                        <Link href={`/meetings/${meeting.id}`} className="flex items-center">
                            <Eye className="mr-2 h-4 w-4" />
                            {t("view")}
                        </Link>
                    </DropdownMenuItem>

                    {/* Conduct - Only for in_progress meetings */}
                    {meeting.status === "in_progress" && (
                        <DropdownMenuItem asChild>
                            <Link
                                href={`/meetings/${meeting.id}/conduct`}
                                className="flex items-center"
                            >
                                <Play className="mr-2 h-4 w-4" />
                                {t("conduct")}
                            </Link>
                        </DropdownMenuItem>
                    )}

                    {/* Edit - Only for scheduled meetings and leaders */}
                    {meeting.status === "scheduled" && isLeader && (
                        <DropdownMenuItem asChild>
                            <Link
                                href={`/meetings/${meeting.id}/edit`}
                                className="flex items-center"
                            >
                                <Edit className="mr-2 h-4 w-4" />
                                {t("edit")}
                            </Link>
                        </DropdownMenuItem>
                    )}

                    <DropdownMenuSeparator />

                    {/* Download */}
                    <DropdownMenuItem
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className="flex items-center"
                    >
                        {isDownloading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Download className="mr-2 h-4 w-4" />
                        )}
                        {t("download")}
                    </DropdownMenuItem>

                    {/* Share */}
                    <DropdownMenuItem
                        onClick={handleShareClick}
                        className="flex items-center"
                    >
                        <Share2 className="mr-2 h-4 w-4" />
                        {t("share")}
                    </DropdownMenuItem>

                    {/* Delete - Only for leaders */}
                    {isLeader && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => {
                                    setIsDropdownOpen(false);
                                    setIsDeleteDialogOpen(true);
                                }}
                                className="flex items-center text-destructive focus:text-destructive"
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                {t("delete")}
                            </DropdownMenuItem>
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Share Dialog - Controlled mode */}
            <ShareDialog
                meeting={currentMeeting}
                workspaceSlug={workspaceSlug}
                onUpdate={handleMeetingUpdate}
                open={isShareOpen}
                onOpenChange={setIsShareOpen}
                hideTrigger
            />

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("deleteConfirmTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("deleteConfirmDesc", { title: meeting.title })}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>{t("cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {t("deleting")}
                                </>
                            ) : (
                                t("delete")
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
