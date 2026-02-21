"use client";

import Link from "next/link";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
    ArrowUp,
    ArrowDown,
    ArrowUpDown,
    Calendar,
    CirclePlay,
    CheckCheck,
    CircleX,
    CalendarDays
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { MeetingRowActions } from "./meeting-row-actions";
import { Database } from "@/types/database";

type MeetingRow = Database["public"]["Tables"]["meetings"]["Row"];

export interface Meeting extends MeetingRow {
    workspace_meeting_id?: string | null;
    templates: { id: string; name: string } | null;
}

interface MeetingsTableProps {
    meetings: Meeting[];
    workspaceSlug: string | null;
    isLeader: boolean;
    sortConfig?: { key: string; direction: 'asc' | 'desc' } | null;
    onSort?: (key: string) => void;
    onMeetingDelete?: (meetingId: string) => void;
}

function getStatusIcon(status: string) {
    switch (status) {
        case "scheduled": return <Calendar className="h-4 w-4 text-blue-500" />;
        case "in_progress": return <CirclePlay className="h-4 w-4 text-yellow-500" />;
        case "completed": return <CheckCheck className="h-4 w-4 text-green-500" />;
        case "cancelled": return <CircleX className="h-4 w-4 text-red-500" />;
        default: return <Calendar className="h-4 w-4" />;
    }
}


function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
    switch (status) {
        case "scheduled": return "default";
        case "in_progress": return "secondary";
        case "completed": return "outline";
        case "cancelled": return "destructive";
        default: return "default";
    }
}
export function MeetingsTable({
    meetings,
    workspaceSlug,
    isLeader,
    sortConfig,
    onSort,
    onMeetingDelete,
}: MeetingsTableProps) {
    const t = useTranslations("Meetings.hub");
    const ts = useTranslations("Meetings.status");
    const SortHeader = ({ column, label, className }: { column: string; label: string; className?: string }) => (
        <TableHead
            className={cn("cursor-pointer bg-white hover:bg-gray-50 transition-colors", className)}
            onClick={() => onSort?.(column)}
        >
            <div className="flex items-center space-x-1">
                <span>{label}</span>
                {sortConfig?.key === column ? (
                    sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                ) : (
                    <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                )}
            </div>
        </TableHead>
    );

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow className="group">
                        <SortHeader column="workspace_meeting_id" label={t("table.id")} className="w-[100px]" />
                        <SortHeader column="title" label={t("table.title")} className="w-[300px]" />
                        <SortHeader column="template" label={t("table.template")} />
                        <SortHeader column="status" label={t("table.status")} />
                        <SortHeader column="scheduled_date" label={t("table.scheduledDate")} />
                        <TableHead className="text-right w-[80px]">{t("table.actions")}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {meetings.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                                <div className="flex flex-col items-center justify-center py-4">
                                    <CalendarDays className="h-8 w-8 text-muted-foreground mb-2" />
                                    <p className="text-muted-foreground">{t("noMeetingsFound")}</p>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : (
                        meetings.map((meeting) => (
                            <TableRow key={meeting.id} className="group hover:bg-muted/50">
                                <TableCell className="font-mono text-xs text-muted-foreground uppercase">
                                    {meeting.workspace_meeting_id || '-'}
                                </TableCell>
                                <TableCell className="font-medium">
                                    <Link href={`/meetings/${meeting.id}`} className="hover:underline">
                                        {meeting.title}
                                    </Link>
                                </TableCell>
                                <TableCell>
                                    <span className="text-sm text-muted-foreground">
                                        {meeting.templates?.name || t("noTemplate")}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        {getStatusIcon(meeting.status)}
                                        <Badge variant={getStatusVariant(meeting.status)}>
                                            {ts(meeting.status)}
                                        </Badge>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {meeting.scheduled_date
                                        ? format(new Date(meeting.scheduled_date), "MMM d, yyyy h:mm a")
                                        : "-"}
                                </TableCell>
                                <TableCell className="text-right">
                                    <MeetingRowActions
                                        meeting={meeting}
                                        workspaceSlug={workspaceSlug}
                                        isLeader={isLeader}
                                        onDelete={onMeetingDelete}
                                    />
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
