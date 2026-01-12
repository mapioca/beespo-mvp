"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Trash2, Link as LinkIcon, Lock, Users } from "lucide-react";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import dynamic from "next/dynamic";
import { OutputData } from "@editorjs/editorjs";
import { Database } from "@/types/database";

// Dynamically import Editor to disable SSR
const Editor = dynamic(() => import("./editor"), { ssr: false });

type NoteRow = Database["public"]["Tables"]["notes"]["Row"];
type AssociationRow = Database["public"]["Tables"]["note_associations"]["Row"];

interface Note extends Omit<NoteRow, 'content'> {
    content: OutputData;
}

interface NoteEditorProps {
    noteId: string | null;
    onNoteUpdated: () => void;
    onNoteDeleted: () => void;
}

export function NoteEditor({ noteId, onNoteUpdated, onNoteDeleted }: NoteEditorProps) {
    const [note, setNote] = useState<Note | null>(null);
    const [title, setTitle] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [content, setContent] = useState<OutputData>({ time: Date.now(), blocks: [] });
    const [associations, setAssociations] = useState<AssociationRow[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Association Dialog State
    const [isAssociationDialogOpen, setIsAssociationDialogOpen] = useState(false);
    const [selectedType, setSelectedType] = useState<"discussion" | "meeting" | "task">("discussion");
    const [availableEntities, setAvailableEntities] = useState<{ id: string; title: string }[]>([]);
    const [selectedEntityId, setSelectedEntityId] = useState<string>("");
    const [isLinking, setIsLinking] = useState(false);

    const supabase = useMemo(() => createClient(), []);

    // Load Note Data
    useEffect(() => {
        async function fetchNote() {
            if (!noteId) {
                setNote(null);
                setTitle("");
                setContent({ time: Date.now(), blocks: [], version: "2.29.0" });
                setAssociations([]);
                return;
            }

            setIsLoading(true);
            try {
                // Fetch Note
                const { data, error } = await supabase
                    .from("notes")
                    .select("*")
                    .eq("id", noteId)
                    .single();

                if (error) {
                    console.error("Error fetching note:", error);
                    toast.error("Failed to load note");
                    return;
                }
                const noteData = data as NoteRow;

                // Fetch Associations
                const { data: assocData } = await supabase
                    .from("note_associations")
                    .select("*")
                    .eq("note_id", noteId);

                setNote(noteData as unknown as Note);
                setTitle(noteData.title);
                setContent((noteData.content as unknown as OutputData) || { time: Date.now(), blocks: [] });
                setAssociations((assocData as AssociationRow[]) || []);

            } catch (error) {
                console.error("Error fetching note:", error);
                toast.error("Failed to load note");
            } finally {
                setIsLoading(false);
            }
        }

        fetchNote();
    }, [noteId, supabase]);


    // Save Function
    const saveNote = useCallback(async () => {
        if (!noteId) return;
        setIsSaving(true);
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase
                .from("notes") as any)
                .update({
                    title,
                    content,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", noteId);

            if (error) {
                console.error("Error saving note:", error);
                toast.error("Failed to save changes");
                return;
            }
            onNoteUpdated();
            toast.success("Saved");
        } catch (error) {
            console.error("Error saving note:", error);
            toast.error("Failed to save changes");
        } finally {
            setIsSaving(false);
        }
    }, [noteId, title, content, onNoteUpdated, supabase]);

    // Global Save Shortcut
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "s") {
                e.preventDefault();
                saveNote();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [saveNote]);

    const handleDelete = async () => {
        if (!noteId) return;
        if (!confirm("Are you sure you want to delete this note?")) return;

        try {
            const { error } = await supabase.from("notes").delete().eq("id", noteId);
            if (error) {
                console.error("Error deleting note:", error);
                toast.error("Failed to delete note");
                return;
            }
            toast.success("Note deleted");
            onNoteDeleted();
        } catch (error) {
            console.error("Error deleting note:", error);
            toast.error("Failed to delete note");
        }
    };

    // Association Logic
    const fetchAvailableEntities = useCallback(async (type: "discussion" | "meeting" | "task") => {
        // Determine table based on type
        let table: "discussions" | "meetings" | "tasks";
        if (type === "discussion") table = "discussions";
        else if (type === "meeting") table = "meetings";
        else table = "tasks";

        const { data } = await supabase
            .from(table)
            .select("id, title")
            .order("created_at", { ascending: false })
            .limit(20);

        setAvailableEntities((data as { id: string; title: string }[]) || []);
    }, [supabase]);

    useEffect(() => {
        if (isAssociationDialogOpen) {
            fetchAvailableEntities(selectedType);
        }
    }, [isAssociationDialogOpen, selectedType, fetchAvailableEntities]);

    const addAssociation = async () => {
        if (!noteId || !selectedEntityId) return;
        setIsLinking(true);
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase.from("note_associations") as any).insert({
                note_id: noteId,
                entity_type: selectedType,
                entity_id: selectedEntityId
            });

            if (error) {
                if (error.code === '23505') { // Unique violation
                    toast.error("Already linked");
                    return;
                } else {
                    console.error("Error inserting association:", error);
                    toast.error("Failed to link");
                    return;
                }
            } else {
                toast.success("Linked successfully");
                setIsAssociationDialogOpen(false);
                // Refresh associations
                const { data } = await supabase
                    .from("note_associations")
                    .select("*")
                    .eq("note_id", noteId);
                setAssociations((data as AssociationRow[]) || []);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to link");
        } finally {
            setIsLinking(false);
        }
    }

    const removeAssociation = async (assocId: string) => {
        try {
            await supabase.from("note_associations").delete().eq("id", assocId);
            setAssociations(prev => prev.filter(a => a.id !== assocId));
            toast.success("Link removed");
        } catch {
            toast.error("Failed to remove link");
        }
    }

    if (!noteId) {
        return (
            <div className="flex h-full items-center justify-center text-muted-foreground">
                Select a note or create a new one to get started.
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Header Toolbar */}
            <div className="border-b p-4 flex items-center justify-between gap-4">
                <Input
                    className="text-xl font-bold border-none shadow-none focus-visible:ring-0 px-0 h-auto"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Note Title"
                />
                <div className="flex items-center gap-2">
                    {note?.is_personal ?
                        <Badge variant="secondary" className="gap-1"><Lock className="w-3 h-3" /> Personal</Badge> :
                        <Badge variant="outline" className="gap-1"><Users className="w-3 h-3" /> Shared</Badge>
                    }
                    <div className="w-px h-6 bg-border mx-2" />

                    <Button variant="ghost" size="icon" onClick={saveNote} disabled={isSaving}>
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    </Button>

                    <Dialog open={isAssociationDialogOpen} onOpenChange={setIsAssociationDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" title="Link to...">
                                <LinkIcon className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Link Note</DialogTitle>
                                <DialogDescription>Associate this note with other items in your workspace.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Type</Label>
                                    <Select value={selectedType} onValueChange={(value) => setSelectedType(value as "discussion" | "meeting" | "task")}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="discussion">Discussion</SelectItem>
                                            <SelectItem value="meeting">Meeting</SelectItem>
                                            <SelectItem value="task">Task</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Item</Label>
                                    <Select value={selectedEntityId} onValueChange={setSelectedEntityId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select an item..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableEntities.map(e => (
                                                <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button className="w-full" onClick={addAssociation} disabled={isLinking}>
                                    {isLinking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Link
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>

                    <Button variant="ghost" size="icon" onClick={handleDelete} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Linked Items Bar */}
            {associations.length > 0 && (
                <div className="px-4 py-2 bg-muted/30 border-b flex flex-wrap gap-2 items-center">
                    <span className="text-xs text-muted-foreground mr-2">Linked to:</span>
                    {associations.map(assoc => (
                        <Badge key={assoc.id} variant="secondary" className="gap-2 pl-2 pr-1 py-1 font-normal">
                            <span className="capitalize">{assoc.entity_type}</span>
                            {/* Ideally update this to show the actual title via a better fetch strategy */}
                            <span className="text-muted-foreground">ID: {assoc.entity_id.slice(0, 4)}...</span>
                            <Button variant="ghost" size="icon" className="h-4 w-4 ml-1 rounded-full" onClick={() => removeAssociation(assoc.id)}>
                                <span className="sr-only">Remove</span>
                                &times;
                            </Button>
                        </Badge>
                    ))}
                </div>
            )}

            {/* Editor Area */}
            <div className="flex-1 overflow-y-auto bg-background flex flex-col p-4">
                <Editor
                    key={noteId} // Force remount on note change
                    holder="editorjs-holder"
                    data={content}
                    onChange={(data) => setContent(data)}
                />
            </div>
        </div>
    );
}
