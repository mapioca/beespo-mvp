"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StickyNote, ArrowRight } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface LinkedNotesListProps {
    entityId: string;
    entityType: 'discussion' | 'meeting' | 'task';
    className?: string;
}

interface LinkedNote {
    id: string; // Association ID
    note: {
        id: string;
        title: string;
        updated_at: string;
        is_personal: boolean;
    };
}

export function LinkedNotesList({ entityId, entityType, className }: LinkedNotesListProps) {
    const [linkedNotes, setLinkedNotes] = useState<LinkedNote[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        async function fetchLinkedNotes() {
            setIsLoading(true);
            const { data, error } = await supabase
                .from("note_associations")
                .select(`
                    id,
                    note:notes (
                        id,
                        title,
                        updated_at,
                        is_personal
                    )
                `)
                .eq("entity_type", entityType)
                .eq("entity_id", entityId);

            if (!error && data) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setLinkedNotes(data as any);
            }
            setIsLoading(false);
        }

        fetchLinkedNotes();
    }, [entityId, entityType, supabase]);

    if (isLoading) {
        return <div className="text-sm text-muted-foreground animate-pulse">Loading linked notes...</div>;
    }

    if (linkedNotes.length === 0) {
        return null; // Don't show anything if no linked notes
    }

    return (
        <Card className={className}>
            <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                    <StickyNote className="w-4 h-4" />
                    Linked Notes
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {linkedNotes.map((item) => (
                        <Link
                            key={item.id}
                            href={`/notes?noteId=${item.note.id}`}
                            className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors group"
                        >
                            <div className="space-y-1 overflow-hidden">
                                <div className="font-medium truncate flex items-center gap-2">
                                    {item.note.title || "Untitled Note"}
                                    {item.note.is_personal && (
                                        <Badge variant="secondary" className="text-[10px] h-4 px-1">Private</Badge>
                                    )}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    Updated {formatDistanceToNow(new Date(item.note.updated_at), { addSuffix: true })}
                                </div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2" />
                        </Link>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
