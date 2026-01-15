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
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
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
import { MoreHorizontal, Pencil, Trash2, ArrowUp, ArrowDown, ArrowUpDown, User } from "lucide-react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useToast } from "@/lib/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Participant {
    id: string;
    name: string;
    created_at: string;
    created_by: string | null;
    profiles?: { full_name: string } | null;
}

interface ParticipantsTableProps {
    participants: Participant[];
    canManage: boolean;
}

type SortKey = "name" | "created_at";
type SortDirection = "asc" | "desc";

export function ParticipantsTable({ participants, canManage }: ParticipantsTableProps) {
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection } | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const router = useRouter();
    const { toast } = useToast();

    // Sort participants
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
                return current.direction === "asc"
                    ? { key, direction: "desc" }
                    : null;
            }
            return { key, direction: "asc" };
        });
    };

    const handleStartEdit = (participant: Participant) => {
        setEditingId(participant.id);
        setEditName(participant.name);
    };

    const handleSaveEdit = async () => {
        if (!editingId || !editName.trim()) return;

        const supabase = createClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from("participants") as any)
            .update({ name: editName.trim() })
            .eq("id", editingId);

        if (error) {
            toast({
                title: "Error",
                description: "Failed to update participant",
                variant: "destructive",
            });
        } else {
            toast({ title: "Participant updated" });
            router.refresh();
        }

        setEditingId(null);
        setEditName("");
    };

    const handleDelete = async () => {
        if (!deleteId) return;

        const supabase = createClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from("participants") as any)
            .delete()
            .eq("id", deleteId);

        if (error) {
            toast({
                title: "Error",
                description: "Failed to delete participant",
                variant: "destructive",
            });
        } else {
            toast({ title: "Participant deleted" });
            router.refresh();
        }

        setDeleteId(null);
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
                            <TableHead>Created By</TableHead>
                            {canManage && <TableHead className="w-[50px]"></TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedParticipants.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={canManage ? 4 : 3}
                                    className="h-24 text-center"
                                >
                                    No participants found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            sortedParticipants.map((participant) => (
                                <TableRow
                                    key={participant.id}
                                    className="group hover:bg-muted/50"
                                >
                                    <TableCell className="font-medium">
                                        {editingId === participant.id ? (
                                            <Input
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                onBlur={handleSaveEdit}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") handleSaveEdit();
                                                    if (e.key === "Escape") {
                                                        setEditingId(null);
                                                        setEditName("");
                                                    }
                                                }}
                                                autoFocus
                                                className="h-8 w-full max-w-[300px]"
                                            />
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <User className="h-4 w-4 text-muted-foreground" />
                                                <span>{participant.name}</span>
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {format(new Date(participant.created_at), "MMM d, yyyy")}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {participant.profiles?.full_name || "—"}
                                    </TableCell>
                                    {canManage && (
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem
                                                        onClick={() => handleStartEdit(participant)}
                                                    >
                                                        <Pencil className="mr-2 h-4 w-4" />
                                                        Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => setDeleteId(participant.id)}
                                                        className="text-destructive focus:text-destructive"
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Participant</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this participant? This action cannot
                            be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
