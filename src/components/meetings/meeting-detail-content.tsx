"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    CalendarDays, Clock, Pencil, Download, Printer, Copy, Trash2,
    ClipboardList, FileText, MoreHorizontal, Share2, Star,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Breadcrumbs } from "@/components/dashboard/breadcrumbs";
import { MarkdownRenderer } from "@/components/meetings/markdown-renderer";
import { calculateTotalDurationWithGrouping } from "@/lib/agenda-grouping";
import { ShareDialog } from "@/components/conduct/share-dialog";
import { useFavoritesStore } from "@/stores/favorites-store";
import { createClient } from "@/lib/supabase/client";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Database } from "@/types/database";

type Meeting = Database["public"]["Tables"]["meetings"]["Row"] & {
    templates?: { name: string } | null;
    profiles?: { full_name: string } | null;
};
type AgendaItem = Database["public"]["Tables"]["agenda_items"]["Row"] & {
    hymn?: { title: string; hymn_number: number } | null;
};

interface MeetingDetailContentProps {
    meeting: Meeting;
    agendaItems: AgendaItem[];
    workspaceSlug: string | null;
    isLeader: boolean;
    totalDuration: number;
    currentUserName: string;
}

/** Small borderless icon button for use inline in the breadcrumb */
function GhostIconButton({
    onClick,
    title,
    children,
    className,
}: {
    onClick?: () => void;
    title: string;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <button
            type="button"
            title={title}
            onClick={onClick}
            className={cn(
                "inline-flex items-center justify-center h-6 w-6 rounded",
                "text-muted-foreground hover:text-foreground hover:bg-accent",
                "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                className
            )}
        >
            {children}
        </button>
    );
}

export function MeetingDetailContent({
    meeting,
    agendaItems: initialAgendaItems,
    workspaceSlug,
    isLeader,
}: MeetingDetailContentProps) {
    const router = useRouter();
    const [currentMeeting, setCurrentMeeting] = useState(meeting);
    const [isDownloading, setIsDownloading] = useState(false);
    const [shareOpen, setShareOpen] = useState(false);

    const totalDuration = calculateTotalDurationWithGrouping(initialAgendaItems);

    const { isFavorite, toggleFavorite } = useFavoritesStore();
    const favorited = isFavorite(currentMeeting.id, "meeting");

    const handleMeetingUpdate = (updatedMeeting: Meeting) => {
        setCurrentMeeting(updatedMeeting);
    };

    const handleDownload = async () => {
        setIsDownloading(true);
        try {
            const res = await fetch(`/api/meetings/${currentMeeting.id}/pdf`);
            if (!res.ok) throw new Error("PDF generation failed");
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${(currentMeeting.title || "agenda").replace(/[^a-z0-9\s-]/gi, "").replace(/\s+/g, "-").toLowerCase()}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Download error:", err);
        } finally {
            setIsDownloading(false);
        }
    };

    const handleToggleFavorite = () => {
        toggleFavorite({
            id: currentMeeting.id,
            type: "meeting",
            title: currentMeeting.title,
            href: `/meetings/${currentMeeting.id}`,
        });
    };

    const handleDuplicate = async () => {
        const supabase = createClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: newMeeting, error } = await (supabase.from("meetings") as any)
            .insert({
                workspace_id: currentMeeting.workspace_id,
                template_id: currentMeeting.template_id,
                title: `${currentMeeting.title} (copy)`,
                scheduled_date: currentMeeting.scheduled_date,
                status: "scheduled",
                markdown_agenda: currentMeeting.markdown_agenda,
            })
            .select()
            .single();
        if (error || !newMeeting) return;

        if (initialAgendaItems.length > 0) {
            const copies = initialAgendaItems.map((item) => ({
                meeting_id: newMeeting.id,
                title: item.title,
                description: item.description,
                duration_minutes: item.duration_minutes,
                order_index: item.order_index,
                item_type: item.item_type,
                hymn_id: item.hymn_id ?? null,
                speaker_id: item.speaker_id ?? null,
                participant_id: item.participant_id ?? null,
            }));
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase.from("agenda_items") as any).insert(copies);
        }

        router.push(`/meetings/${newMeeting.id}`);
        router.refresh();
    };

    const handleDelete = async () => {
        if (!window.confirm("Delete this meeting? This cannot be undone.")) return;
        const supabase = createClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from("agenda_items") as any).delete().eq("meeting_id", currentMeeting.id);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from("meetings") as any).delete().eq("id", currentMeeting.id);
        router.push("/meetings/agendas");
        router.refresh();
    };

    return (
        <div className="flex flex-col h-full overflow-hidden bg-muted/30">
            <div className="px-3 pt-3">
            <Breadcrumbs
                className="rounded-lg bg-card ring-1 ring-border"
                items={[
                    { label: "Meetings", href: "/meetings/agendas", icon: <CalendarDays className="h-3.5 w-3.5" /> },
                    { label: "Agendas", href: "/meetings/agendas", icon: <ClipboardList className="h-3.5 w-3.5" /> },
                    { label: currentMeeting.title, icon: <FileText className="h-3.5 w-3.5" /> },
                ]}
                inlineAction={
                    <>
                        {/* Favorite toggle */}
                        <GhostIconButton
                            title={favorited ? "Remove from favorites" : "Add to favorites"}
                            onClick={handleToggleFavorite}
                        >
                            <Star
                                className={cn(
                                    "h-3.5 w-3.5 transition-colors",
                                    favorited ? "fill-amber-400 text-amber-400" : ""
                                )}
                            />
                        </GhostIconButton>

                        {/* More options */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    type="button"
                                    title="More options"
                                    className={cn(
                                        "inline-flex items-center justify-center h-6 w-6 rounded",
                                        "text-muted-foreground hover:text-foreground hover:bg-accent",
                                        "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    )}
                                >
                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-48">
                                {isLeader && (
                                    <DropdownMenuItem asChild>
                                        <Link href={`/meetings/${currentMeeting.id}/edit`} className="flex items-center gap-2">
                                            <Pencil className="h-4 w-4" />
                                            Edit agenda
                                        </Link>
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={handleDuplicate}>
                                    <Copy className="h-4 w-4" />
                                    Duplicate agenda
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleDownload} disabled={isDownloading}>
                                    <Download className="h-4 w-4" />
                                    {isDownloading ? "Generating PDF…" : "Download PDF"}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleDelete}>
                                    <Trash2 className="h-4 w-4" />
                                    Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </>
                }
                action={
                    <div className="flex items-center gap-1 shrink-0">
                        {/* Estimated duration */}
                        <span className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap mr-2">
                            <Clock className="h-3.5 w-3.5" />
                            ~{totalDuration} min
                        </span>

                        {/* Share */}
                        <Button
                            variant="ghost"
                            size="icon"
                            title="Share"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => setShareOpen(true)}
                        >
                            <Share2 className="h-4 w-4" />
                        </Button>

                        {/* Print */}
                        <Button
                            variant="ghost"
                            size="icon"
                            title="Print Agenda"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => window.open(`/meetings/${currentMeeting.id}/print`, "_blank", "noopener,noreferrer")}
                        >
                            <Printer className="h-4 w-4" />
                        </Button>
                    </div>
                }
            />
            </div>

            {/* Scrollable agenda body */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-8">
                <div className="max-w-[850px] mx-auto w-full">
                    {currentMeeting.markdown_agenda ? (
                        <div className="bg-background border rounded-none sm:rounded-lg shadow-sm w-full min-h-[1056px] p-8 sm:p-12 lg:p-16">
                            <MarkdownRenderer markdown={currentMeeting.markdown_agenda} />
                        </div>
                    ) : (
                        <div className="p-8 text-center text-muted-foreground border rounded-lg bg-background shadow-sm">
                            <p>No agenda available for this meeting.</p>
                            {isLeader && (
                                <Button asChild variant="outline" className="mt-4">
                                    <Link href={`/meetings/${currentMeeting.id}/edit`}>
                                        Create Agenda
                                    </Link>
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Share dialog — rendered via portal, triggered from the toolbar */}
            <ShareDialog
                meeting={currentMeeting}
                workspaceSlug={workspaceSlug}
                onUpdate={handleMeetingUpdate}
                open={shareOpen}
                onOpenChange={setShareOpen}
                hideTrigger
            />
        </div>
    );
}
