"use client";

import { useState, useEffect } from "react";
import { NotesList } from "@/components/notes/notes-list";
import { NoteEditor } from "@/components/notes/note-editor";
import { createClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";

import { Suspense } from "react";

function NotesPageContent() {
    const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const [userId, setUserId] = useState("");
    const searchParams = useSearchParams();

    useEffect(() => {
        // Get current user ID
        const supabase = createClient();
        supabase.auth.getUser().then(({ data }) => {
            if (data.user) setUserId(data.user.id);
        });

        // Handle query param for deep linking
        const noteIdParam = searchParams.get('noteId');
        if (noteIdParam) {
            setSelectedNoteId(noteIdParam);
        }
    }, [searchParams]);

    const handleNoteUpdated = () => {
        setRefreshKey(prev => prev + 1);
    };

    const handleNoteDeleted = () => {
        setSelectedNoteId(null);
        setRefreshKey(prev => prev + 1);
    };

    return (
        <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
            <div className="w-80 flex-shrink-0 bg-background border-r">
                <NotesList
                    selectedId={selectedNoteId}
                    onSelect={setSelectedNoteId}
                    refreshKey={refreshKey}
                    currentUserId={userId}
                />
            </div>
            <div className="flex-1 min-w-0 bg-background">
                <NoteEditor
                    noteId={selectedNoteId}
                    onNoteUpdated={handleNoteUpdated}
                    onNoteDeleted={handleNoteDeleted}

                />
            </div>
        </div>
    );
}

export default function NotesPage() {
    return (
        <Suspense fallback={<div className="p-8">Loading notes...</div>}>
            <NotesPageContent />
        </Suspense>
    );
}
