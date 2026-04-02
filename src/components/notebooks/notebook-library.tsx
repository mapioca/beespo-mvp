"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { NotebookGrid } from "./notebook-grid";
import { CreateNotebookModal } from "./create-notebook-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Search } from "lucide-react";
import { Breadcrumbs } from "@/components/dashboard/breadcrumbs";
import { toast } from "@/lib/toast";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
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

interface Notebook {
    id: string;
    title: string;
    cover_style: string;
    updated_at: string;
    notes_count?: number;
}

interface NotebookWithNotes {
    id: string;
    title: string;
    cover_style: string;
    updated_at: string;
    notes: { count: number }[];
}

export function NotebookLibrary() {
    const [notebooks, setNotebooks] = useState<Notebook[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [renameNotebook, setRenameNotebook] = useState<Notebook | null>(null);
    const [renameValue, setRenameValue] = useState("");
    const [deleteNotebook, setDeleteNotebook] = useState<Notebook | null>(null);
    const [isRenaming, setIsRenaming] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const fetchNotebooks = useCallback(async () => {
        setIsLoading(true);

        // Get notebooks with notes count
        const { data, error } = await (supabase
            .from("notebooks") as ReturnType<typeof supabase.from>)
            .select(`
        id,
        title,
        cover_style,
        updated_at,
        notes:notes(count)
      `)
            .order("updated_at", { ascending: false });

        if (error) {
            console.error("Error fetching notebooks:", error);
            toast.error("Failed to load notebooks");
        } else if (data) {
            // Transform notes count from array to number
            const transformed = data.map((notebook: NotebookWithNotes) => ({
                ...notebook,
                notes_count: Array.isArray(notebook.notes)
                    ? notebook.notes[0]?.count ?? 0
                    : 0,
            }));
            setNotebooks(transformed as unknown as Notebook[]);
        }

        setIsLoading(false);
    }, [supabase]);

    useEffect(() => {
        fetchNotebooks();
    }, [fetchNotebooks]);

    const handleRenameNotebook = async (id: string, currentTitle: string) => {
        const notebook = notebooks.find((item) => item.id === id);
        if (!notebook) return;
        setRenameNotebook(notebook);
        setRenameValue(currentTitle);
    };

    const submitRenameNotebook = async () => {
        if (!renameNotebook) return;
        const nextTitle = renameValue.trim();
        if (!nextTitle || nextTitle === renameNotebook.title) {
            setRenameNotebook(null);
            setRenameValue("");
            return;
        }

        setIsRenaming(true);
        const { error } = await (supabase
            .from("notebooks") as ReturnType<typeof supabase.from>)
            .update({ title: nextTitle })
            .eq("id", renameNotebook.id);

        if (error) {
            toast.error("Failed to rename notebook");
            setIsRenaming(false);
            return;
        }

        setNotebooks((current) =>
            current.map((notebook) =>
                notebook.id === renameNotebook.id ? { ...notebook, title: nextTitle } : notebook
            )
        );
        setIsRenaming(false);
        setRenameNotebook(null);
        setRenameValue("");
        toast.success("Notebook renamed");
    };

    const handleDeleteNotebook = async (id: string, _title: string) => {
        const notebook = notebooks.find((item) => item.id === id);
        if (!notebook) return;
        setDeleteNotebook(notebook);
    };

    const confirmDeleteNotebook = async () => {
        if (!deleteNotebook) return;
        setIsDeleting(true);
        const { error } = await (supabase
            .from("notebooks") as ReturnType<typeof supabase.from>)
            .delete()
            .eq("id", deleteNotebook.id);

        if (error) {
            toast.error("Failed to delete notebook");
            setIsDeleting(false);
            return;
        }

        setNotebooks((current) => current.filter((notebook) => notebook.id !== deleteNotebook.id));
        setIsDeleting(false);
        setDeleteNotebook(null);
        toast.success("Notebook deleted");
    };

    const handleShareNotebook = async (id: string, title: string) => {
        try {
            const shareUrl = `${window.location.origin}/notebooks/${id}`;
            await navigator.clipboard.writeText(shareUrl);
            toast.success("Link copied", { description: `${title} is ready to share.` });
        } catch {
            toast.error("Failed to copy link");
        }
    };

    const handleCreateNotebook = async (title: string, coverStyle: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        // Get workspace_id from profile
        const { data: profile } = await (supabase
            .from("profiles") as ReturnType<typeof supabase.from>)
            .select("workspace_id")
            .eq("id", user.id)
            .single();

        if (!profile?.workspace_id) throw new Error("No workspace");

        const { data, error } = await (supabase
            .from("notebooks") as ReturnType<typeof supabase.from>)
            .insert({
                title,
                cover_style: coverStyle,
                workspace_id: profile.workspace_id,
                created_by: user.id,
            })
            .select()
            .single();

        if (error) throw error;

        toast.success("Notebook created", { description: `"${title}" is ready for your notes.` });

        // Refresh list and navigate to new notebook
        await fetchNotebooks();
        if (data) {
            router.push(`/notebooks/${data.id}`);
        }
    };

    const filteredNotebooks = notebooks.filter((notebook) =>
        notebook.title.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex h-full flex-col bg-white">
            <Breadcrumbs className="rounded-none border-b border-border/60 bg-white px-4 py-1.5 ring-0" />

            <div className="sticky top-0 z-10 bg-white backdrop-blur-xl">
                <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-5 px-5 py-5 sm:px-6 lg:px-8">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-2xl">
                            <div className="mb-3 flex items-center gap-2">
                                <span className="inline-flex items-center rounded-full border border-border/60 bg-control px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                                    Notebook space
                                </span>
                                <span className="inline-flex items-center rounded-full border border-border/60 bg-white px-2.5 py-1 text-[12px] font-medium text-foreground/72">
                                    {notebooks.length} notebook{notebooks.length !== 1 ? "s" : ""}
                                </span>
                            </div>
                            <h1 className="text-[30px] font-semibold tracking-[-0.04em] text-foreground sm:text-[36px]">
                                A quieter, more intentional home for your notes.
                            </h1>
                            <p className="mt-3 max-w-xl text-[15px] leading-7 text-muted-foreground">
                                Organize ongoing work, private research, and team knowledge in notebooks that feel curated instead of cluttered.
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            {notebooks.length > 0 && (
                                <div className="relative min-w-[280px] flex-1 sm:min-w-[340px]">
                                    <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground stroke-[1.6]" />
                                    <Input
                                        placeholder="Search notebooks..."
                                        className="h-11 rounded-full border-border/60 bg-white pl-10 text-[14px] shadow-[0_1px_0_rgba(15,23,42,0.04)] focus-visible:ring-0 focus-visible:border-foreground/30"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                    />
                                </div>
                            )}

                            <Button
                                onClick={() => setIsModalOpen(true)}
                                className="h-11 rounded-full px-5 text-[13px] font-semibold shadow-[0_12px_28px_rgba(15,23,42,0.14)]"
                            >
                                <Plus className="mr-1.5 h-4 w-4 stroke-[1.8]" />
                                New notebook
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-white px-5 pb-8 pt-5 sm:px-6 lg:px-8">
                <div className="mx-auto w-full max-w-[1500px]">
                    {isLoading ? (
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(152px,1fr))] gap-x-5 gap-y-8 xl:grid-cols-[repeat(auto-fill,minmax(168px,1fr))]">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="space-y-2.5">
                                    <div
                                        className="animate-pulse rounded-[18px] border border-border/50 bg-white/80 shadow-[0_14px_28px_rgba(15,23,42,0.05)]"
                                        style={{ aspectRatio: "0.74" }}
                                    />
                                    <div className="flex items-center justify-between">
                                        <div className="h-7 w-20 animate-pulse rounded-full border border-border/50 bg-white/80" />
                                        <div className="h-8 w-8 animate-pulse rounded-full border border-border/50 bg-white/80" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <NotebookGrid
                            notebooks={filteredNotebooks}
                            onRename={handleRenameNotebook}
                            onDelete={handleDeleteNotebook}
                            onShare={handleShareNotebook}
                        />
                    )}
                </div>
            </div>

            {/* Create Modal */}
            <CreateNotebookModal
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
                onCreateNotebook={handleCreateNotebook}
            />

            <Dialog
                open={!!renameNotebook}
                onOpenChange={(open) => {
                    if (!open && !isRenaming) {
                        setRenameNotebook(null);
                        setRenameValue("");
                    }
                }}
            >
                <DialogContent className="sm:max-w-[460px]">
                    <DialogHeader>
                        <DialogTitle>Rename notebook</DialogTitle>
                        <DialogDescription>
                            Update the title that appears on the notebook cover.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2 py-2">
                        <Label htmlFor="notebook-rename">Notebook title</Label>
                        <Input
                            id="notebook-rename"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            placeholder="Enter notebook title..."
                            autoFocus
                            disabled={isRenaming}
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setRenameNotebook(null);
                                setRenameValue("");
                            }}
                            disabled={isRenaming}
                        >
                            Cancel
                        </Button>
                        <Button onClick={submitRenameNotebook} disabled={isRenaming || !renameValue.trim()}>
                            {isRenaming ? "Saving..." : "Save"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog
                open={!!deleteNotebook}
                onOpenChange={(open) => {
                    if (!open && !isDeleting) {
                        setDeleteNotebook(null);
                    }
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete notebook?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {deleteNotebook
                                ? `Delete "${deleteNotebook.title}"? This cannot be undone.`
                                : "This action cannot be undone."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteNotebook} disabled={isDeleting}>
                            {isDeleting ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
