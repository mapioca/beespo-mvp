"use client";

import { useState } from "react";
import {
    ExternalLink, Copy, Check, Mail, Pencil, Trash2, Loader2, Info,
} from "lucide-react";
import { ZoomIcon } from "@/components/ui/zoom-icon";
import {
    Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/lib/toast";
import { Database } from "@/types/database";

type Meeting = Database["public"]["Tables"]["meetings"]["Row"] & {
    templates?: { name: string } | null;
    profiles?: { full_name: string } | null;
};

interface ZoomMeetingSheetProps {
    meeting: Meeting;
    totalDuration: number;
    isZoomFreeAccount: boolean | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onMeetingUpdate: (updated: Partial<Meeting>) => void;
}

const FREE_LIMIT = 40;

export function ZoomMeetingSheet({
    meeting,
    totalDuration,
    isZoomFreeAccount,
    open,
    onOpenChange,
    onMeetingUpdate,
}: ZoomMeetingSheetProps) {
    const [isCopied, setIsCopied] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [isSendingInvite, setIsSendingInvite] = useState(false);
    const [inviteSent, setInviteSent] = useState(false);
    const [editTopic, setEditTopic] = useState(meeting.title ?? "");
    const [editDate, setEditDate] = useState(
        meeting.scheduled_date ? meeting.scheduled_date.slice(0, 16) : ""
    );
    const [editDuration, setEditDuration] = useState<number>(
        totalDuration > 0 ? totalDuration : FREE_LIMIT
    );
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const formattedDate = meeting.scheduled_date
        ? new Date(meeting.scheduled_date).toLocaleString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })
        : "Not scheduled";

    const handleCopy = async () => {
        if (!meeting.zoom_join_url) return;
        await navigator.clipboard.writeText(meeting.zoom_join_url);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const handleSendInvite = async () => {
        if (!inviteEmail) return;
        setIsSendingInvite(true);
        try {
            const res = await fetch(`/api/meetings/${meeting.id}/zoom/invite`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: inviteEmail }),
            });
            if (!res.ok) {
                const data = await res.json();
                toast.error(data.error || "Failed to send invite");
                return;
            }
            setInviteSent(true);
            setInviteEmail("");
        } catch {
            toast.error("Failed to send invite. Please try again.");
        } finally {
            setIsSendingInvite(false);
        }
    };

    const handleSaveChanges = async () => {
        setIsSaving(true);
        try {
            const res = await fetch(`/api/meetings/${meeting.id}/zoom`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    topic: editTopic,
                    start_time: editDate,
                    duration: editDuration,
                }),
            });
            if (!res.ok) {
                const data = await res.json();
                toast.error(data.error || "Failed to update Zoom meeting");
                return;
            }
            toast.success("Zoom meeting updated");
        } catch {
            toast.error("Failed to update. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm("Remove the Zoom meeting? This will cancel the meeting on Zoom.")) return;
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/meetings/${meeting.id}/zoom`, { method: "DELETE" });
            if (!res.ok) {
                const data = await res.json();
                toast.error(data.error || "Failed to remove Zoom meeting");
                return;
            }
            onMeetingUpdate({ zoom_meeting_id: null, zoom_join_url: null, zoom_start_url: null, zoom_passcode: null });
            onOpenChange(false);
            toast.success("Zoom meeting removed");
        } catch {
            toast.error("Failed to remove. Please try again.");
        } finally {
            setIsDeleting(false);
        }
    };

    const meetingIdFormatted = meeting.zoom_meeting_id
        ? meeting.zoom_meeting_id.replace(/(\d{3})(\d{4})(\d{4})/, "$1 $2 $3")
        : null;

    const durationOverLimit = editDuration > FREE_LIMIT;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto flex flex-col gap-0 p-0">
                <SheetHeader className="px-6 pt-6 pb-4">
                    <SheetTitle className="flex items-center gap-2 text-base">
                        <ZoomIcon className="h-4 w-4" />
                        Zoom Meeting
                    </SheetTitle>
                </SheetHeader>

                <div className="flex flex-col gap-6 px-6 pb-8">
                    {/* Meeting Details */}
                    <section>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                            Meeting Details
                        </p>
                        <div className="space-y-2 text-sm">
                            <div className="flex gap-2">
                                <span className="text-muted-foreground w-16 shrink-0">Topic</span>
                                <span className="font-medium">{meeting.title}</span>
                            </div>
                            <div className="flex gap-2">
                                <span className="text-muted-foreground w-16 shrink-0">Date</span>
                                <span>{formattedDate}</span>
                            </div>
                            {meetingIdFormatted && (
                                <div className="flex gap-2">
                                    <span className="text-muted-foreground w-16 shrink-0">ID</span>
                                    <span className="font-mono">{meetingIdFormatted}</span>
                                </div>
                            )}
                            {meeting.zoom_passcode && (
                                <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground w-16 shrink-0">Passcode</span>
                                    <span className="font-mono font-medium tracking-widest">
                                        {meeting.zoom_passcode}
                                    </span>
                                    <button
                                        type="button"
                                        title="Copy passcode"
                                        onClick={() => navigator.clipboard.writeText(meeting.zoom_passcode!)}
                                        className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        <Copy className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </section>

                    <Separator />

                    {/* Join / Start */}
                    <section className="space-y-2">
                        <div className="flex gap-2">
                            {meeting.zoom_start_url && (
                                <Button size="sm" className="flex-1 gap-1.5" asChild>
                                    <a href={meeting.zoom_start_url} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="h-3.5 w-3.5" />
                                        Start Meeting
                                    </a>
                                </Button>
                            )}
                            {meeting.zoom_join_url && (
                                <Button size="sm" variant="outline" className="flex-1 gap-1.5" asChild>
                                    <a href={meeting.zoom_join_url} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="h-3.5 w-3.5" />
                                        Join Meeting
                                    </a>
                                </Button>
                            )}
                        </div>
                        <Button
                            size="sm"
                            variant="outline"
                            className="w-full gap-1.5"
                            onClick={handleCopy}
                        >
                            {isCopied ? (
                                <>
                                    <Check className="h-3.5 w-3.5 text-green-500" />
                                    Copied!
                                </>
                            ) : (
                                <>
                                    <Copy className="h-3.5 w-3.5" />
                                    Copy Join Link
                                </>
                            )}
                        </Button>
                    </section>

                    <Separator />

                    {/* Email Invite */}
                    <section>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                            Invite via Email
                        </p>
                        <div className="flex gap-2">
                            <Input
                                type="email"
                                placeholder="colleague@example.com"
                                value={inviteEmail}
                                onChange={(e) => {
                                    setInviteEmail(e.target.value);
                                    setInviteSent(false);
                                }}
                                className="h-8 text-sm"
                            />
                            <Button
                                size="sm"
                                onClick={handleSendInvite}
                                disabled={isSendingInvite || !inviteEmail}
                                className="gap-1.5 shrink-0"
                            >
                                {isSendingInvite ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <Mail className="h-3.5 w-3.5" />
                                )}
                                Send
                            </Button>
                        </div>
                        {inviteSent && (
                            <p className="flex items-center gap-1 text-xs text-green-600 mt-1.5">
                                <Check className="h-3 w-3" />
                                Invite sent
                            </p>
                        )}
                    </section>

                    <Separator />

                    {/* Edit Meeting */}
                    <section>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                            Edit Meeting
                        </p>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-muted-foreground mb-1 block">Topic</label>
                                <Input
                                    value={editTopic}
                                    onChange={(e) => setEditTopic(e.target.value)}
                                    className="h-8 text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-muted-foreground mb-1 block">Date &amp; Time</label>
                                <Input
                                    type="datetime-local"
                                    value={editDate}
                                    onChange={(e) => setEditDate(e.target.value)}
                                    className="h-8 text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-muted-foreground mb-1 block">
                                    Duration (minutes)
                                </label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={isZoomFreeAccount === true ? FREE_LIMIT : 600}
                                    value={editDuration}
                                    onChange={(e) => {
                                        const v = Number(e.target.value);
                                        setEditDuration(
                                            isZoomFreeAccount === true ? Math.min(v, FREE_LIMIT) : v
                                        );
                                    }}
                                    className="h-8 text-sm"
                                />
                            </div>

                            {/* Warning: hidden for confirmed paid accounts */}
                            {isZoomFreeAccount !== false && (
                                <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-400">
                                    <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                    <span>
                                        {isZoomFreeAccount === true
                                            ? `Your Zoom account is limited to ${FREE_LIMIT}-minute meetings. Upgrade at zoom.us for longer sessions.`
                                            : durationOverLimit
                                                ? `Free Zoom accounts are capped at ${FREE_LIMIT} minutes. Your participants may be disconnected after that.`
                                                : `Free Zoom accounts are limited to ${FREE_LIMIT}-minute meetings. Upgrade at zoom.us for longer sessions.`}
                                    </span>
                                </div>
                            )}

                            <Button
                                size="sm"
                                className="w-full gap-1.5"
                                onClick={handleSaveChanges}
                                disabled={isSaving}
                            >
                                {isSaving ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <Pencil className="h-3.5 w-3.5" />
                                )}
                                Save Changes
                            </Button>
                        </div>
                    </section>

                    <Separator />

                    {/* Danger Zone */}
                    <section>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="w-full gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={handleDelete}
                            disabled={isDeleting}
                        >
                            {isDeleting ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                            )}
                            Remove Zoom Meeting
                        </Button>
                    </section>
                </div>
            </SheetContent>
        </Sheet>
    );
}
