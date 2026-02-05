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
}

export function NotebookGrid({ notebooks }: NotebookGridProps) {
    if (notebooks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                    <BookOpen className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">
                    No notebooks yet
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                    Create your first notebook to start organizing your notes.
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
            {notebooks.map((notebook) => (
                <NotebookCard
                    key={notebook.id}
                    id={notebook.id}
                    title={notebook.title}
                    coverStyle={notebook.cover_style}
                    updatedAt={notebook.updated_at}
                    notesCount={notebook.notes_count}
                />
            ))}
        </div>
    );
}
