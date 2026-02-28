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
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";
import { Database } from "@/types/database";

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
    const router = useRouter();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isShareOpen, setIsShareOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [currentMeeting, setCurrentMeeting] = useState(meeting);



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

            toast.success("Meeting deleted", { description: "The meeting has been permanently deleted." });

            onDelete?.(meeting.id);
            router.refresh();
        } catch (error) {
            console.error("Delete failed:", error);
            toast.error("Delete failed", { description: "Could not delete meeting. Please try again." });
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
                        <span className="sr-only">Open menu</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[160px]">
                    {/* View - Always available */}
                    <DropdownMenuItem asChild>
                        <Link href={`/meetings/${meeting.id}`} className="flex items-center">
                            <Eye className="mr-2 h-4 w-4" />
                            View
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

                    {/* Edit - Only for scheduled meetings and leaders */}
                    {meeting.status === "scheduled" && isLeader && (
                        <DropdownMenuItem asChild>
                            <Link
                                href={`/meetings/${meeting.id}/edit`}
                                className="flex items-center"
                            >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
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

                    {/* Share */}
                    <DropdownMenuItem
                        onClick={handleShareClick}
                        className="flex items-center"
                    >
                        <Share2 className="mr-2 h-4 w-4" />
                        Share
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
                                Delete
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
                        <AlertDialogTitle>Delete Meeting</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete &quot;{meeting.title}&quot;? This action
                            cannot be undone. All agenda items and associated data will be
                            permanently removed.
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
