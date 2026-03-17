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
import {
    ArrowUp,
    ArrowDown,
    ArrowUpDown,
    Eye,
    Trash2,
    MoreHorizontal,
    MessagesSquare
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export interface Discussion {
    id: string;
    title: string;
    description?: string | null;
    category: string;
    status: string;
    priority: string;
    due_date?: string | null;
    workspace_discussion_id?: string | null;
    created_at: string;
}

interface DiscussionsTableProps {
    discussions: Discussion[];
    sortConfig?: { key: string; direction: 'asc' | 'desc' } | null;
    onSort?: (key: string) => void;
    onDelete?: (id: string) => Promise<void>;
}


function formatStatus(status: string): string {
    return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function formatCategory(category: string): string {
    return category.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}


function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
    switch (status) {
        case "new": return "default";
        case "active": return "default";
        case "decision_required": return "destructive";
        case "monitoring": return "secondary";
        case "resolved": return "outline";
        case "deferred": return "outline";
        default: return "default";
    }
}

export function DiscussionsTable({ discussions, sortConfig, onSort, onDelete }: DiscussionsTableProps) {
    const [deleteTarget, setDeleteTarget] = useState<Discussion | null>(null);
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
                        <SortHeader column="title" label="Title" className="w-[300px]" />
                        <SortHeader column="category" label="Category" />
                        <SortHeader column="status" label="Status" />
                        <SortHeader column="priority" label="Priority" />
                        <SortHeader column="due_date" label="Due Date" />
                        <TableHead className="text-right w-[80px]">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {discussions.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                                <div className="flex flex-col items-center justify-center py-4">
                                    <MessagesSquare className="h-8 w-8 text-muted-foreground mb-2" />
                                    <p className="text-muted-foreground">No discussions found.</p>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : (
                        discussions.map((discussion) => (
                            <TableRow key={discussion.id} className="group hover:bg-muted/50">
                                <TableCell className="font-medium">
                                    <Link href={`/meetings/discussions/${discussion.id}`} className="hover:underline">
                                        <div className="flex flex-col">
                                            <span>{discussion.title}</span>
                                            {discussion.description && (
                                                <span className="text-xs text-muted-foreground truncate max-w-[280px]">
                                                    {discussion.description}
                                                </span>
                                            )}
                                        </div>
                                    </Link>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline">{formatCategory(discussion.category)}</Badge>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={getStatusVariant(discussion.status)}>
                                        {formatStatus(discussion.status)}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <span className="text-sm capitalize">{discussion.priority}</span>
                                </TableCell>
                                <TableCell>
                                    {discussion.due_date
                                        ? format(new Date(discussion.due_date), "MMM d, yyyy")
                                        : "-"}
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
                                                <Link href={`/meetings/discussions/${discussion.id}`}>
                                                    <Eye className="mr-2 h-4 w-4" />
                                                    View
                                                </Link>
                                            </DropdownMenuItem>
                                            {onDelete && (
                                                <>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        className="text-destructive focus:text-destructive"
                                                        onClick={() => setDeleteTarget(discussion)}
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

            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Discussion</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete &quot;{deleteTarget?.title}&quot;? This action cannot be undone.
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
