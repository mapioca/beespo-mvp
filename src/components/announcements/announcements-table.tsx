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
import { Button } from "@/components/ui/button";
import {
    ArrowUp,
    ArrowDown,
    ArrowUpDown,
    FileEdit,
    CheckCircle,
    Clock,
    Archive,
    Minus,
    AlertCircle,
    Megaphone
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export interface Announcement {
    id: string;
    title: string;
    content?: string | null;
    priority: string;
    status: string;
    deadline?: string | null;
    workspace_announcement_id?: string | null;
    created_at: string;
}

interface AnnouncementsTableProps {
    announcements: Announcement[];
    sortConfig?: { key: string; direction: 'asc' | 'desc' } | null;
    onSort?: (key: string) => void;
}

function getStatusIcon(status: string) {
    switch (status) {
        case "draft": return <FileEdit className="h-4 w-4 text-muted-foreground" />;
        case "active": return <CheckCircle className="h-4 w-4 text-green-500" />;
        case "expired": return <Clock className="h-4 w-4 text-muted-foreground" />;
        case "archived": return <Archive className="h-4 w-4 text-muted-foreground" />;
        default: return <FileEdit className="h-4 w-4" />;
    }
}

function getPriorityIcon(priority: string) {
    switch (priority) {
        case "urgent": return <AlertCircle className="h-4 w-4 text-destructive" />;
        case "high": return <ArrowUp className="h-4 w-4 text-destructive" />;
        case "low": return <ArrowDown className="h-4 w-4 text-muted-foreground" />;
        default: return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
}

function formatStatus(status: string): string {
    return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
    switch (status) {
        case "draft": return "secondary";
        case "active": return "default";
        case "expired": return "outline";
        case "archived": return "outline";
        default: return "default";
    }
}

function getPriorityVariant(priority: string): "default" | "secondary" | "destructive" {
    switch (priority) {
        case "urgent": return "destructive";
        case "high": return "destructive";
        case "low": return "secondary";
        default: return "default";
    }
}

export function AnnouncementsTable({ announcements, sortConfig, onSort }: AnnouncementsTableProps) {
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
                        <SortHeader column="workspace_announcement_id" label="ID" className="w-[100px]" />
                        <SortHeader column="title" label="Title" className="w-[300px]" />
                        <SortHeader column="priority" label="Priority" />
                        <SortHeader column="status" label="Status" />
                        <SortHeader column="deadline" label="Deadline" />
                        <TableHead className="text-right w-[80px]">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {announcements.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                                <div className="flex flex-col items-center justify-center py-4">
                                    <Megaphone className="h-8 w-8 text-muted-foreground mb-2" />
                                    <p className="text-muted-foreground">No announcements found.</p>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : (
                        announcements.map((announcement) => (
                            <TableRow key={announcement.id} className="group hover:bg-muted/50">
                                <TableCell className="font-mono text-xs text-muted-foreground uppercase">
                                    {announcement.workspace_announcement_id || 'ANNC-0000'}
                                </TableCell>
                                <TableCell className="font-medium">
                                    <Link href={`/announcements/${announcement.id}`} className="hover:underline">
                                        <div className="flex flex-col">
                                            <span>{announcement.title}</span>
                                            {announcement.content && (
                                                <span className="text-xs text-muted-foreground truncate max-w-[280px]">
                                                    {announcement.content}
                                                </span>
                                            )}
                                        </div>
                                    </Link>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        {getPriorityIcon(announcement.priority)}
                                        <Badge variant={getPriorityVariant(announcement.priority)}>
                                            {announcement.priority.toUpperCase()}
                                        </Badge>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        {getStatusIcon(announcement.status)}
                                        <Badge variant={getStatusVariant(announcement.status)}>
                                            {formatStatus(announcement.status)}
                                        </Badge>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {announcement.deadline
                                        ? format(new Date(announcement.deadline), "MMM d, yyyy")
                                        : "No deadline"}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" asChild>
                                        <Link href={`/announcements/${announcement.id}`}>View</Link>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
