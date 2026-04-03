"use client";

import { useState, useEffect, useCallback, use, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getCoverById } from "@/lib/notebooks/notebook-covers";
import { Breadcrumbs } from "@/components/dashboard/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    ArrowRight,
    Book,
    FilePlusCorner,
    FileText,
    Plus,
    MoreHorizontal,
    Edit2,
    Trash2,
    Star,
    StarOff,
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
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { FavoriteButton } from "@/components/navigation/favorite-button";
import { RecentVisitTracker } from "@/components/navigation/recent-visit-tracker";
import { toggleFavorite } from "@/lib/actions/navigation-actions";
import { useNavigationStore } from "@/stores/navigation-store";

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
    const supabase = createClient();
    const isFavorite = useNavigationStore((state) => state.isFavorite);
    const applyFavoriteToggle = useNavigationStore((state) => state.applyFavoriteToggle);

    const fetchData = useCallback(async () => {
        setIsLoading(true);

        // Fetch notebook
        const { data: notebookData, error: notebookError } = await (supabase
            .from("notebooks") as ReturnType<typeof supabase.from>)
            .select("id, title, cover_style")
            .eq("id", resolvedParams.notebookId)
            .single();

        if (notebookError || !notebookData) {
            toast.error("Notebook not found");
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
    }, [resolvedParams.notebookId, supabase, router]);

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
            toast.error("Failed to update title");
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
            toast.error("Failed to delete notebook");
        } else {
            toast.success("Notebook deleted");
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
            toast.error("Failed to create note");
        } else if (data) {
            router.push(`/notebooks/${notebook.id}/notes/${data.id}`);
        }
    };

    const cover = notebook ? getCoverById(notebook.cover_style) : null;
    const navigationItem = useMemo(() => (
        notebook
            ? {
                id: notebook.id,
                entityType: "notebook" as const,
                title: notebook.title,
                href: `/notebooks/${notebook.id}`,
            }
            : null
    ), [notebook]);

    const handleNoteFavoriteToggle = async (note: Note) => {
        const navigationItem = {
            id: note.id,
            entityType: "note" as const,
            title: note.title || "Untitled Note",
            href: `/notebooks/${resolvedParams.notebookId}/notes/${note.id}`,
            icon: "note" as const,
            parentTitle: notebook?.title ?? null,
        };
        const currentlyFavorite = isFavorite("note", note.id);
        const nextFavorite = !currentlyFavorite;

        applyFavoriteToggle(navigationItem, nextFavorite);

        const result = await toggleFavorite(navigationItem);
        if ("error" in result) {
            applyFavoriteToggle(navigationItem, currentlyFavorite);
            toast.error(result.error ?? "Unable to update favorite.");
            return;
        }

        applyFavoriteToggle(result.item, result.favorited);
    };

    if (isLoading || !notebook || !cover) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-muted-foreground">Loading...</div>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col bg-white">
            <RecentVisitTracker item={navigationItem} />
            <Breadcrumbs
                className="rounded-none border-b border-border/60 bg-white px-4 py-1.5 ring-0"
                items={[
                    { label: "Data", iconType: "database" },
                    { label: "Notebooks", href: "/notebooks", iconType: "notebook" },
                    { label: notebook.title, iconType: "notebook" },
                ]}
            />

            <div
                className="sticky top-0 z-10 border-b border-border/55 bg-white/95 backdrop-blur-xl"
                style={{
                    backgroundImage: `linear-gradient(180deg, ${cover.gradient.match(/\#[0-9a-fA-F]{6}/)?.[0] ?? "#f5efe7"}18 0%, rgba(255,255,255,0.96) 58%, rgba(255,255,255,0.95) 100%)`,
                }}
            >
                <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-5 px-5 py-5 sm:px-6 lg:px-8">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-3xl">
                            <div className="mb-3 flex items-center gap-2">
                                <span className="inline-flex items-center rounded-full border border-border/60 bg-control px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                                    Notebook
                                </span>
                                <span className="inline-flex items-center rounded-full border border-border/60 bg-white px-2.5 py-1 text-[12px] font-medium text-foreground/72">
                                    {notes.length} note{notes.length !== 1 ? "s" : ""}
                                </span>
                            </div>

                                <div className="min-w-0">
                                    {isEditing ? (
                                        <div className="flex items-center gap-3">
                                            <Book className="h-8 w-8 text-muted-foreground shrink-0" />
                                            <Input
                                                value={editTitle}
                                                onChange={(e) => setEditTitle(e.target.value)}
                                                onBlur={handleSaveTitle}
                                                onKeyDown={(e) => e.key === "Enter" && handleSaveTitle()}
                                                className="h-auto max-w-xl rounded-2xl border-border/60 bg-white/90 px-4 py-3 text-[28px] font-semibold tracking-[-0.04em] shadow-[0_1px_0_rgba(15,23,42,0.04)] focus-visible:border-foreground/30 focus-visible:ring-0 sm:text-[34px]"
                                                autoFocus
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3">
                                            <Book className="h-8 w-8 text-foreground/80 shrink-0" />
                                            <h1 className="text-[30px] font-semibold tracking-[-0.04em] text-foreground sm:text-[36px]">
                                                {notebook.title}
                                            </h1>
                                        </div>
                                    )}

                                    <p className="mt-3 max-w-2xl text-[15px] leading-7 text-muted-foreground">
                                        {notes.length === 0
                                            ? "Capture drafts, meeting follow-ups, and shared context in one focused notebook."
                                            : "Open a note to keep refining your thinking, references, and working documents in one place."}
                                    </p>
                                </div>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <Button
                                onClick={handleCreateNote}
                                className="h-11 rounded-full px-5 text-[13px] font-semibold shadow-[0_12px_28px_rgba(15,23,42,0.14)]"
                            >
                                <Plus className="mr-1.5 h-4 w-4 stroke-[1.8]" />
                                New note
                            </Button>

                            {navigationItem ? (
                                <FavoriteButton
                                    item={navigationItem}
                                    variant="ghost"
                                    size="icon"
                                    className="h-11 w-11 rounded-full border border-border/60 bg-white text-muted-foreground shadow-[0_1px_0_rgba(15,23,42,0.04)] hover:bg-control hover:text-foreground"
                                    iconClassName="h-4 w-4"
                                    activeClassName="border-amber-300 text-foreground"
                                />
                            ) : null}

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-11 w-11 rounded-full border border-border/60 bg-white text-muted-foreground shadow-[0_1px_0_rgba(15,23,42,0.04)] hover:bg-control hover:text-foreground"
                                    >
                                        <MoreHorizontal className="h-4 w-4 stroke-[1.8]" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-44">
                                    <DropdownMenuItem onClick={() => setIsEditing(true)}>
                                        <Edit2 className="mr-2 h-4 w-4 stroke-[1.6]" />
                                        Rename
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        className="text-destructive"
                                        onClick={() => setShowDeleteDialog(true)}
                                    >
                                        <Trash2 className="mr-2 h-4 w-4 stroke-[1.6]" />
                                        Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex min-h-0 flex-1 overflow-visible bg-white px-5 pb-8 pt-6 sm:px-6 lg:px-8">
                <div className="mx-auto flex min-h-0 w-full max-w-[1500px]">
                    <div className="min-h-0 flex-1">
                        {notes.length === 0 ? (
                            <div className="flex h-full min-h-[460px] flex-col items-center justify-center rounded-[28px] bg-control/18 px-8 py-12 text-center">
                                <FilePlusCorner className="mb-5 h-14 w-14 text-muted-foreground/50 stroke-[1.5]" />
                                <h3 className="text-[24px] font-semibold tracking-[-0.03em] text-foreground">
                                    This notebook is ready for its first note
                                </h3>
                                <p className="mt-3 max-w-xl text-[14px] leading-7 text-muted-foreground">
                                    Start with a draft, outline, or research note. Everything you add here will stay grouped together in a calmer, easier-to-scan workspace.
                                </p>
                                <Button
                                    onClick={handleCreateNote}
                                    className="mt-6 h-10 rounded-full px-5 text-[13px] font-semibold shadow-[0_10px_24px_rgba(15,23,42,0.12)]"
                                >
                                    <Plus className="mr-1.5 h-4 w-4 stroke-[1.8]" />
                                    Create first note
                                </Button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                                {notes.map((note) => (
                                    <div
                                        key={note.id}
                                        className={cn(
                                            "group relative flex min-h-[148px] flex-col rounded-[24px] border border-border/65 bg-white p-5 shadow-[0_12px_24px_rgba(15,23,42,0.05)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-border/80 hover:shadow-[0_18px_34px_rgba(15,23,42,0.08)]"
                                        )}
                                    >
                                        <Link
                                            href={`/notebooks/${notebook.id}/notes/${note.id}`}
                                            aria-label={`Open ${note.title || "Untitled Note"}`}
                                            className="absolute inset-0 rounded-[24px]"
                                        />

                                        <div className="pointer-events-none relative z-10">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex min-w-0 items-start gap-3">
                                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] border border-border/55 bg-control/55 text-foreground/66">
                                                        <FileText className="h-4.5 w-4.5 stroke-[1.7]" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-foreground/46">
                                                            Note
                                                        </p>
                                                        <h3 className="mt-1 line-clamp-2 text-[20px] font-semibold leading-[1.08] tracking-[-0.03em] text-foreground">
                                                            {note.title || "Untitled Note"}
                                                        </h3>
                                                    </div>
                                                </div>
                                                <div className="shrink-0 rounded-full bg-control/75 px-2.5 py-1 text-[10px] font-semibold tracking-[0.02em] text-foreground/62">
                                                    Updated{" "}
                                                    {new Date(note.updated_at).toLocaleDateString(undefined, {
                                                        month: "short",
                                                        day: "numeric",
                                                    })}
                                                </div>
                                            </div>

                                            <div className="mt-5 flex items-center justify-between border-t border-border/55 pt-4 text-[12px] text-foreground/54">
                                                <span>Open note</span>
                                                <span className="inline-flex items-center gap-1 font-medium text-foreground/68 transition-colors group-hover:text-foreground">
                                                    Continue
                                                    <ArrowRight className="h-3.5 w-3.5 stroke-[1.8]" />
                                                </span>
                                            </div>
                                        </div>

                                        <div className="pointer-events-auto absolute right-3 top-3 z-20">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 rounded-full bg-white/88 text-muted-foreground shadow-[0_1px_0_rgba(15,23,42,0.06)] backdrop-blur hover:bg-white hover:text-foreground"
                                                    >
                                                        <MoreHorizontal className="h-4 w-4 stroke-[1.8]" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem asChild>
                                                        <Link href={`/notebooks/${notebook.id}/notes/${note.id}`}>
                                                            <FileText className="mr-2 h-4 w-4 stroke-[1.6]" />
                                                            Open
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => void handleNoteFavoriteToggle(note)}>
                                                        {isFavorite("note", note.id) ? (
                                                            <StarOff className="mr-2 h-4 w-4 stroke-[1.6]" />
                                                        ) : (
                                                            <Star className="mr-2 h-4 w-4 stroke-[1.6]" />
                                                        )}
                                                        {isFavorite("note", note.id)
                                                            ? "Remove from favorites"
                                                            : "Add to favorites"}
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
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
