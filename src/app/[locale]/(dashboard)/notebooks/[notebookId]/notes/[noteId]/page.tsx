"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getCoverById } from "@/lib/notebooks/notebook-covers";
import { NoteEditor } from "@/components/notes/note-editor";
import { ChevronRight, Library, BookOpen } from "lucide-react";
import { toast } from "@/lib/toast";
import { useTranslations } from "next-intl";

interface Notebook {
    id: string;
    title: string;
    cover_style: string;
}

interface NoteEditorPageProps {
    params: Promise<{ notebookId: string; noteId: string }>;
}

export default function NoteEditorPage({ params }: NoteEditorPageProps) {
    const t = useTranslations("Dashboard.Notebooks");
    const resolvedParams = use(params);
    const [notebook, setNotebook] = useState<Notebook | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const supabase = createClient();

    const fetchNotebook = useCallback(async () => {
        setIsLoading(true);

        const { data, error } = await (supabase
            .from("notebooks") as ReturnType<typeof supabase.from>)
            .select("id, title, cover_style")
            .eq("id", resolvedParams.notebookId)
            .single();

        if (error || !data) {
            toast.error(t("notebookNotFound"));
            router.push("/notebooks");
            return;
        }

        setNotebook(data as Notebook);
        setIsLoading(false);
    }, [resolvedParams.notebookId, supabase, router, t]);

    useEffect(() => {
        fetchNotebook();
    }, [fetchNotebook]);

    // Callback kept for interface compatibility
    const handleNoteUpdated = () => {
        // Could trigger refresh if needed
    };

    const handleNoteDeleted = () => {
        router.push(`/notebooks/${resolvedParams.notebookId}`);
    };

    const cover = notebook ? getCoverById(notebook.cover_style) : null;

    if (isLoading || !notebook || !cover) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-muted-foreground">{t("loading")}</div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Breadcrumb Header */}
            <div
                className="flex-shrink-0 px-6 py-4 border-b"
                style={{
                    background: `linear-gradient(to bottom, ${cover.gradient.match(/\#[0-9a-fA-F]{6}/)?.[0]}10, transparent)`,
                }}
            >
                <nav className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Link
                        href="/notebooks"
                        className="flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                        <Library className="w-4 h-4" />
                        <span>{t("library")}</span>
                    </Link>
                    <ChevronRight className="w-4 h-4" />
                    <Link
                        href={`/notebooks/${notebook.id}`}
                        className="flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                        <div
                            className="w-3 h-4 rounded-sm"
                            style={{ background: cover.gradient }}
                        />
                        <span>{notebook.title}</span>
                    </Link>
                    <ChevronRight className="w-4 h-4" />
                    <span className="flex items-center gap-1 text-foreground">
                        <BookOpen className="w-4 h-4" />
                        <span>{t("note")}</span>
                    </span>
                </nav>
            </div>

            {/* Note Editor */}
            <div className="flex-1 min-h-0 overflow-hidden">
                <NoteEditor
                    noteId={resolvedParams.noteId}
                    onNoteUpdated={handleNoteUpdated}
                    onNoteDeleted={handleNoteDeleted}
                />
            </div>
        </div>
    );
}
