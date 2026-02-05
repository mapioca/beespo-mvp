"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getCoverById } from "@/lib/notebooks/notebook-covers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    ChevronRight,
    Library,
    Plus,
    MoreHorizontal,
    Edit2,
    Trash2,
} from "lucide-react";
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
import { useToast } from "@/lib/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Note {
    id: string;
    title: string;
    is_personal: boolean;
    updated_at: string;
    created_by: string;
}

interface Notebook {
    id: string;
    title: string;
    cover_style: string;
}

interface NotebookViewPageProps {
    params: Promise<{ notebookId: string }>;
}

export default function NotebookViewPage({ params }: NotebookViewPageProps) {
    const resolvedParams = use(params);
    const [notebook, setNotebook] = useState<Notebook | null>(null);
    const [notes, setNotes] = useState<Note[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState("");
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const router = useRouter();
    const { toast } = useToast();
    const supabase = createClient();

    const fetchData = useCallback(async () => {
        setIsLoading(true);

        // Fetch notebook
        const { data: notebookData, error: notebookError } = await (supabase
            .from("notebooks") as ReturnType<typeof supabase.from>)
            .select("id, title, cover_style")
            .eq("id", resolvedParams.notebookId)
            .single();

        if (notebookError || !notebookData) {
            toast({
                title: "Notebook not found",
                variant: "destructive",
            });
            router.push("/notebooks");
            return;
        }

        setNotebook(notebookData as Notebook);
        setEditTitle(notebookData.title);

        // Fetch notes for this notebook
        const { data: notesData } = await (supabase
            .from("notes") as ReturnType<typeof supabase.from>)
            .select("id, title, is_personal, updated_at, created_by")
            .eq("notebook_id", resolvedParams.notebookId)
            .order("updated_at", { ascending: false });

        setNotes((notesData as Note[]) || []);
        setIsLoading(false);
    }, [resolvedParams.notebookId, supabase, router, toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSaveTitle = async () => {
        if (!editTitle.trim() || !notebook) return;

        const { error } = await (supabase
            .from("notebooks") as ReturnType<typeof supabase.from>)
            .update({ title: editTitle.trim() })
            .eq("id", notebook.id);

        if (error) {
            toast({ title: "Failed to update title", variant: "destructive" });
        } else {
            setNotebook({ ...notebook, title: editTitle.trim() });
            setIsEditing(false);
        }
    };

    const handleDeleteNotebook = async () => {
        if (!notebook) return;

        const { error } = await (supabase
            .from("notebooks") as ReturnType<typeof supabase.from>)
            .delete()
            .eq("id", notebook.id);

        if (error) {
            toast({ title: "Failed to delete notebook", variant: "destructive" });
        } else {
            toast({ title: "Notebook deleted" });
            router.push("/notebooks");
        }
    };

    const handleCreateNote = async () => {
        if (!notebook) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await (supabase
            .from("profiles") as ReturnType<typeof supabase.from>)
            .select("workspace_id")
            .eq("id", user.id)
            .single();

        if (!profile?.workspace_id) return;

        const { data, error } = await (supabase
            .from("notes") as ReturnType<typeof supabase.from>)
            .insert({
                title: "Untitled Note",
                content: { time: Date.now(), blocks: [], version: "2.29.0" },
                notebook_id: notebook.id,
                workspace_id: profile.workspace_id,
                created_by: user.id,
                is_personal: false,
            })
            .select()
            .single();

        if (error) {
            toast({ title: "Failed to create note", variant: "destructive" });
        } else if (data) {
            router.push(`/notebooks/${notebook.id}/notes/${data.id}`);
        }
    };

    const cover = notebook ? getCoverById(notebook.cover_style) : null;

    if (isLoading || !notebook || !cover) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-muted-foreground">Loading...</div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header with cover accent */}
            <div
                className="flex-shrink-0 p-6 border-b"
                style={{
                    background: `linear-gradient(to bottom, ${cover.gradient.match(/\#[0-9a-fA-F]{6}/)?.[0]}15, transparent)`,
                }}
            >
                {/* Breadcrumb */}
                <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
                    <Link
                        href="/notebooks"
                        className="flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                        <Library className="w-4 h-4" />
                        <span>Library</span>
                    </Link>
                    <ChevronRight className="w-4 h-4" />
                    <span className="text-foreground font-medium">{notebook.title}</span>
                </nav>

                {/* Title & Actions */}
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        {/* Mini cover indicator */}
                        <div
                            className="w-8 h-10 rounded shadow-sm flex-shrink-0"
                            style={{ background: cover.gradient }}
                        />

                        {isEditing ? (
                            <Input
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                onBlur={handleSaveTitle}
                                onKeyDown={(e) => e.key === "Enter" && handleSaveTitle()}
                                className="text-2xl font-bold h-auto py-1 max-w-md"
                                autoFocus
                            />
                        ) : (
                            <h1 className="text-2xl font-bold tracking-tight">
                                {notebook.title}
                            </h1>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <Button onClick={handleCreateNote}>
                            <Plus className="w-4 h-4 mr-2" />
                            New Note
                        </Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="w-4 h-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                                    <Edit2 className="w-4 h-4 mr-2" />
                                    Rename
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => setShowDeleteDialog(true)}
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                <p className="text-sm text-muted-foreground mt-2">
                    {notes.length} note{notes.length !== 1 ? "s" : ""}
                </p>
            </div>

            {/* Notes List */}
            <div className="flex-1 overflow-y-auto">
                {notes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                            <Plus className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-medium mb-2">No notes yet</h3>
                        <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                            Start writing in this notebook by creating your first note.
                        </p>
                        <Button onClick={handleCreateNote}>
                            <Plus className="w-4 h-4 mr-2" />
                            Create First Note
                        </Button>
                    </div>
                ) : (
                    <div className="p-4 space-y-2">
                        {notes.map((note) => (
                            <Link
                                key={note.id}
                                href={`/notebooks/${notebook.id}/notes/${note.id}`}
                                className={cn(
                                    "block p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                                )}
                            >
                                <h3 className="font-medium truncate">
                                    {note.title || "Untitled Note"}
                                </h3>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Updated{" "}
                                    {new Date(note.updated_at).toLocaleDateString(undefined, {
                                        month: "short",
                                        day: "numeric",
                                    })}
                                </p>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Delete Confirmation */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete notebook?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete &quot;{notebook.title}&quot; and all
                            notes inside it. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={handleDeleteNotebook}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
