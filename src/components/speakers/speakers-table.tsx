"use client";

import { useState } from "react";
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
import { ArrowUp, ArrowDown, ArrowUpDown, Speech, MoreHorizontal, Eye, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export interface Speaker {
    id: string;
    name: string;
    topic?: string | null;
    is_confirmed: boolean;
    workspace_speaker_id?: string | null;
    created_at: string;
    agenda_items?: Array<{
        meeting?: {
            id: string;
            title: string;
            scheduled_date: string;
        } | null;
    }>;
}

interface SpeakersTableProps {
    speakers: Speaker[];
    sortConfig?: { key: string; direction: 'asc' | 'desc' } | null;
    onSort?: (key: string) => void;
    onDelete?: (id: string) => Promise<void>;
}



function getStatusVariant(isConfirmed: boolean): "default" | "secondary" | "outline" {
    return isConfirmed ? "default" : "secondary";
}

export function SpeakersTable({ speakers, sortConfig, onSort, onDelete }: SpeakersTableProps) {
    const [deleteTarget, setDeleteTarget] = useState<Speaker | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (!deleteTarget || !onDelete) return;
        setIsDeleting(true);
        await onDelete(deleteTarget.id);
        setIsDeleting(false);
        setDeleteTarget(null);
    };
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
                        <SortHeader column="name" label="Name" className="w-[200px]" />
                        <SortHeader column="topic" label="Topic" />
                        <TableHead>Meeting</TableHead>
                        <SortHeader column="meeting_date" label="Date" />
                        <SortHeader column="is_confirmed" label="Status" />
                        <TableHead className="text-right w-[80px]">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {speakers.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                                <div className="flex flex-col items-center justify-center py-4">
                                    <Speech className="h-8 w-8 text-muted-foreground mb-2" />
                                    <p className="text-muted-foreground">No speakers found.</p>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : (
                        speakers.map((speaker) => {
                            const meeting = speaker.agenda_items?.[0]?.meeting;
                            return (
                                <TableRow key={speaker.id} className="group hover:bg-muted/50">
                                    <TableCell className="font-medium">
                                        <Link href={`/speakers/${speaker.id}`} className="hover:underline">
                                            {speaker.name}
                                        </Link>
                                    </TableCell>
                                    <TableCell className="max-w-xs truncate">
                                        {speaker.topic || "-"}
                                    </TableCell>
                                    <TableCell>
                                        {meeting ? (
                                            <Link
                                                href={`/meetings/${meeting.id}`}
                                                className="text-sm text-muted-foreground hover:underline"
                                            >
                                                {meeting.title}
                                            </Link>
                                        ) : (
                                            <span className="text-sm text-muted-foreground">
                                                Not assigned
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {meeting?.scheduled_date
                                            ? format(new Date(meeting.scheduled_date), "MMM d, yyyy")
                                            : "-"}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={getStatusVariant(speaker.is_confirmed)}>
                                            {speaker.is_confirmed ? "Confirmed" : "Pending"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/speakers/${speaker.id}`}>
                                                        <Eye className="mr-2 h-4 w-4" />
                                                        View
                                                    </Link>
                                                </DropdownMenuItem>
                                                {onDelete && (
                                                    <>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem 
                                                            className="text-destructive focus:text-destructive"
                                                            onClick={() => setDeleteTarget(speaker)}
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            );
                        })
                    )}
                </TableBody>
            </Table>

            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Speaker</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete &quot;{deleteTarget?.name}&quot;? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
