"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import {
    Eye,
    Play,
    Download,
    Share2,
    Trash2,
    Loader2,
    Smartphone,
} from "lucide-react";
import { ShareDialog } from "@/components/conduct/share-dialog";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";
import { Database } from "@/types/database";
import { TableRowActionTrigger } from "@/components/ui/table-row-action-trigger";

type Meeting = Database["public"]["Tables"]["meetings"]["Row"] & {
    templates?: { name: string } | null;
};

interface MeetingRowActionsProps {
    meeting: Meeting;
    workspaceSlug: string | null;
    isLeader: boolean;
    workspace?: "agendas" | "programs";
    onDelete?: (meetingId: string) => void;
}

export function MeetingRowActions({
    meeting,
    workspaceSlug,
    isLeader,
    workspace = "agendas",
    onDelete,
}: MeetingRowActionsProps) {
    const router = useRouter();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isShareOpen, setIsShareOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [activeShareCount, setActiveShareCount] = useState<number | null>(null);
    const [currentMeeting, setCurrentMeeting] = useState(meeting);

    const isProgramWorkspace = workspace === "programs";
    const entityLabel = isProgramWorkspace ? "program" : "agenda";
    const entityLabelTitle = isProgramWorkspace ? "Program" : "Agenda";
    const openLabel = isLeader ? `Open ${entityLabel}` : `View ${entityLabel}`;
    const shareLabel = `Share ${entityLabel}`;
    const deleteLabel = `Delete ${entityLabel}`;
    const publicViewLabel = isProgramWorkspace ? "Program view" : "Agenda view";
    const publicViewHref =
        workspaceSlug == null
            ? null
            : isProgramWorkspace
              ? `/${workspaceSlug}/program/${meeting.id}`
              : `/${workspaceSlug}/meeting/${meeting.id}`;



    const handleOpenDeleteDialog = async () => {
        setIsDropdownOpen(false);
        // Fetch active share count before showing dialog
        try {
            const res = await fetch(`/api/share/meeting?meeting_id=${meeting.id}`);
            if (res.ok) {
                const data = await res.json();
                setActiveShareCount((data.shares ?? []).length);
            }
        } catch {
            setActiveShareCount(0);
        }
        setIsDeleteDialogOpen(true);
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            // Revoke all active shares before deleting
            const sharesRes = await fetch(`/api/share/meeting?meeting_id=${meeting.id}`);
            if (sharesRes.ok) {
                const sharesData = await sharesRes.json();
                const shares = sharesData.shares ?? [];
                await Promise.all(
                    shares.map((s: { id: string }) =>
                        fetch(`/api/share/meeting?id=${s.id}`, { method: "DELETE" })
                    )
                );
            }

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

            toast.success(`${entityLabelTitle} deleted`, {
                description: `The ${entityLabel} has been permanently deleted.`,
            });

            onDelete?.(meeting.id);
            router.refresh();
        } catch (error) {
            console.error("Delete failed:", error);
            toast.error("Delete failed", {
                description: `Could not delete ${entityLabel}. Please try again.`,
            });
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
                    <TableRowActionTrigger label={`Open ${entityLabel} actions`} />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[160px]">
                    {/* View/Edit - Goes to builder (mode depends on user role) */}
                    <DropdownMenuItem asChild>
                        <Link href={`/meetings/${meeting.id}`} className="flex items-center">
                            <Eye className="mr-2 h-4 w-4" />
                            {openLabel}
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
                                Conduct
                            </Link>
                        </DropdownMenuItem>
                    )}

                    <DropdownMenuSeparator />

                    {/* Print */}
                    <DropdownMenuItem asChild>
                        <a href={`/meetings/${meeting.id}/print`} target="_blank" rel="noopener noreferrer" className="flex items-center cursor-pointer">
                            <Download className="mr-2 h-4 w-4" />
                            Print
                        </a>
                    </DropdownMenuItem>

                    {/* Public plan view */}
                    {publicViewHref && (
                        <DropdownMenuItem asChild>
                            <a href={publicViewHref} target="_blank" rel="noopener noreferrer" className="flex items-center cursor-pointer">
                                <Smartphone className="mr-2 h-4 w-4" />
                                {publicViewLabel}
                            </a>
                        </DropdownMenuItem>
                    )}

                    {/* Share */}
                    <DropdownMenuItem
                        onClick={handleShareClick}
                        className="flex items-center"
                    >
                        <Share2 className="mr-2 h-4 w-4" />
                        {shareLabel}
                    </DropdownMenuItem>

                    {/* Delete - Only for leaders */}
                    {isLeader && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={handleOpenDeleteDialog}
                                className="flex items-center text-destructive focus:text-destructive"
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                {deleteLabel}
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
                        <AlertDialogTitle>{deleteLabel}</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete &quot;{meeting.title}&quot;? This action
                            cannot be undone. All plan items and associated data will be
                            permanently removed.
                            {activeShareCount !== null && activeShareCount > 0 && (
                                <span className="block mt-2 font-medium text-destructive">
                                    This {entityLabel} is currently shared with {activeShareCount}{" "}
                                    {activeShareCount === 1 ? "person" : "people"}. Deleting it
                                    will remove their access immediately.
                                </span>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                "Delete"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
