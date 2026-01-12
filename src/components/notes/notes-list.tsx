"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, User, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface NoteSummary {
    id: string;
    title: string;
    is_personal: boolean;
    updated_at: string;
    created_by: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    content?: any;
}

interface NotesListProps {
    selectedId: string | null;
    onSelect: (id: string) => void;
    // Trigger to refresh list from parent or editor
    refreshKey: number;
    currentUserId: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function NotesList({ selectedId, onSelect, refreshKey}: NotesListProps) {
    const [notes, setNotes] = useState<NoteSummary[]>([]);
    const [filter, setFilter] = useState("all");
    const [search, setSearch] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        async function fetchNotes() {
            setIsLoading(true);

            let query = supabase
                .from("notes")
                .select("id, title, is_personal, updated_at, created_by")
                .order("updated_at", { ascending: false });

            if (filter === "personal") {
                query = query.eq("is_personal", true);
            } else if (filter === "shared") {
                query = query.eq("is_personal", false);
            }

            const { data, error } = await query;

            if (!error && data) {
                setNotes(data);
            }
            setIsLoading(false);
        }

        fetchNotes();
    }, [filter, refreshKey, supabase]);

    const filteredNotes = notes.filter(note => {
        return !(search && !note.title.toLowerCase().includes(search.toLowerCase()));

    });

    const createNote = async (isPersonal: boolean) => {
        const { data, error } = await supabase.from("notes").insert({
            title: "Untitled Note",
            is_personal: isPersonal,
            content: { time: Date.now(), blocks: [], version: "2.29.0" },
            workspace_id: (await supabase.auth.getUser()).data.user?.user_metadata?.workspace_id
        }).select().single();

        if (!data && error) {
            // If insert failed due to missing workspace_id, we need to fetch it.
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data: profile } = await supabase.from('profiles').select('workspace_id').eq('id', user.id).single();
            if (!profile) return;

            const { data: newNote, error: createError } = await supabase.from("notes").insert({
                title: "Untitled Note",
                is_personal: isPersonal,
                content: { time: Date.now(), blocks: [], version: "2.29.0" },
                created_by: user.id,
                workspace_id: profile.workspace_id
            }).select().single();

            if (createError) {
                console.error(createError);
                return;
            }

            if (newNote) {
                onSelect(newNote.id);
                setNotes([newNote, ...notes]);
            }
        } else if (data) {
            onSelect(data.id);
            setNotes([data, ...notes]);
        }
    };

    return (
        <div className="flex flex-col h-full border-r bg-muted/10">
            <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-lg">Notes</h2>
                    <Button variant="outline" size="icon" onClick={() => createNote(filter === "personal")}>
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>

                <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search notes..."
                        className="pl-8"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <Tabs defaultValue="all" onValueChange={setFilter} className="w-full">
                    <TabsList className="w-full grid grid-cols-3">
                        <TabsTrigger value="all">All</TabsTrigger>
                        <TabsTrigger value="shared">Shared</TabsTrigger>
                        <TabsTrigger value="personal">Private</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
                ) : filteredNotes.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                        No notes found. Create one!
                    </div>
                ) : (
                    <div className="space-y-1 p-2">
                        {filteredNotes.map(note => (
                            <button
                                key={note.id}
                                onClick={() => onSelect(note.id)}
                                className={cn(
                                    "w-full text-left p-3 rounded-lg transition-colors hover:bg-accent group border border-transparent",
                                    selectedId === note.id ? "bg-accent border-border shadow-sm" : ""
                                )}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className={cn("font-medium truncate", !note.title && "text-muted-foreground italic")}>
                                        {note.title || "Untitled"}
                                    </span>
                                    {note.is_personal ?
                                        <User className="h-3 w-3 text-muted-foreground/70" /> :
                                        <Users className="h-3 w-3 text-muted-foreground/70" />
                                    }
                                </div>
                                <div className="text-xs text-muted-foreground flex justify-between">
                                    <span>
                                        {formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
