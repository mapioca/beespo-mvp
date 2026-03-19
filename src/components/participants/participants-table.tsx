"use client";

import { useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
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
import { MoreHorizontal, Eye, Trash2, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";


export interface Participant {
    id: string;
    name: string;
    created_at: string;
    created_by: string | null;
    profiles?: { full_name: string } | null;
}

interface ParticipantsTableProps {
    participants: Participant[];
    canManage: boolean;
    onViewParticipant?: (participant: Participant) => void;
    onDeleteParticipant?: (id: string) => Promise<void>;
}

type SortKey = "name" | "created_at";
type SortDirection = "asc" | "desc";


export function ParticipantsTable({ participants, canManage, onViewParticipant, onDeleteParticipant }: ParticipantsTableProps) {
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection } | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Participant | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const sortedParticipants = [...participants].sort((a, b) => {
        if (!sortConfig) return 0;
        const { key, direction } = sortConfig;
        let comparison = 0;
        if (key === "name") {
            comparison = a.name.localeCompare(b.name);
        } else if (key === "created_at") {
            comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
        return direction === "asc" ? comparison : -comparison;
    });

    const handleSort = (key: SortKey) => {
        setSortConfig((current) => {
            if (current?.key === key) {
                return current.direction === "asc" ? { key, direction: "desc" } : null;
            }
            return { key, direction: "asc" };
        });
    };

    const handleDelete = async () => {
        if (!deleteTarget || !onDeleteParticipant) return;
        setIsDeleting(true);
        await onDeleteParticipant(deleteTarget.id);
        setIsDeleting(false);
        setDeleteTarget(null);
    };

    const SortHeader = ({
        column,
        label,
        className,
    }: {
        column: SortKey;
        label: string;
        className?: string;
    }) => (
        <TableHead
            className={cn(
                "cursor-pointer bg-white hover:bg-gray-50 transition-colors",
                className
            )}
            onClick={() => handleSort(column)}
        >
            <div className="flex items-center space-x-1">
                <span>{label}</span>
                {sortConfig?.key === column ? (
                    sortConfig.direction === "asc" ? (
                        <ArrowUp className="h-3 w-3" />
                    ) : (
                        <ArrowDown className="h-3 w-3" />
                    )
                ) : (
                    <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                )}
            </div>
        </TableHead>
    );

    return (
        <>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow className="group">
                            <SortHeader column="name" label="Name" className="w-[400px]" />
                            <SortHeader column="created_at" label="Created" />
                            <TableHead className="text-right w-[80px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedParticipants.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={3}
                                    className="h-24 text-center"
                                >
                                    No participants found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            sortedParticipants.map((participant) => (
                                <TableRow key={participant.id} className="group hover:bg-muted/50">
                                    <TableCell className="font-medium">
                                        <button
                                            onClick={() => onViewParticipant?.(participant)}
                                            className="hover:underline text-left"
                                        >
                                            {participant.name}
                                        </button>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {format(new Date(participant.created_at), "MMM d, yyyy")}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => onViewParticipant?.(participant)}>
                                                    <Eye className="mr-2 h-4 w-4" />
                                                    View
                                                </DropdownMenuItem>
                                                {canManage && onDeleteParticipant && (
                                                    <>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            onClick={() => setDeleteTarget(participant)}
                                                            className="text-destructive focus:text-destructive"
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
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Participant</AlertDialogTitle>
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
        </>
    );
}
