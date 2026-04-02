"use client";

import { NotebookCard } from "./notebook-card";
import { BookOpen } from "lucide-react";

interface Notebook {
    id: string;
    title: string;
    cover_style: string;
    updated_at: string;
    notes_count?: number;
}

interface NotebookGridProps {
    notebooks: Notebook[];
    onRename?: (id: string, title: string) => void;
    onDelete?: (id: string, title: string) => void;
    onShare?: (id: string, title: string) => void;
}

export function NotebookGrid({ notebooks, onRename, onDelete, onShare }: NotebookGridProps) {
    if (notebooks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center rounded-[28px] border border-border/60 bg-white/72 px-6 py-24 text-center shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-border/60 bg-control">
                    <BookOpen className="h-7 w-7 text-muted-foreground stroke-[1.6]" />
                </div>
                <h3 className="mb-2 text-[22px] font-semibold tracking-[-0.02em] text-foreground">
                    No notebooks yet
                </h3>
                <p className="max-w-md text-[14px] leading-6 text-muted-foreground">
                    Create your first notebook to start organizing your notes.
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(152px,1fr))] gap-x-5 gap-y-8 xl:grid-cols-[repeat(auto-fill,minmax(168px,1fr))]">
            {notebooks.map((notebook) => (
                <NotebookCard
                    key={notebook.id}
                    id={notebook.id}
                    title={notebook.title}
                    coverStyle={notebook.cover_style}
                    updatedAt={notebook.updated_at}
                    notesCount={notebook.notes_count}
                    onRename={onRename}
                    onDelete={onDelete}
                    onShare={onShare}
                />
            ))}
        </div>
    );
}
