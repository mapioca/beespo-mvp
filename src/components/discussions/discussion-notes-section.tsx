"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/lib/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Trash2, Edit2, Save, X } from "lucide-react";

interface Note {
  id: string;
  content: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  meeting_id: string | null;
  creator?: { full_name: string };
  meeting?: { title: string; scheduled_date: string };
}

interface DiscussionNotesSectionProps {
  discussionId: string;
  initialNotes: Note[];
  currentUserId: string;
}

export function DiscussionNotesSection({
  discussionId,
  initialNotes,
  currentUserId,
}: DiscussionNotesSectionProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const handleAddNote = async () => {
    if (!newNoteContent.trim()) return;

    setIsAddingNote(true);
    const supabase = createClient();

    const { data, error } = await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("discussion_notes") as any)
      .insert({
        discussion_id: discussionId,
        content: newNoteContent,
        created_by: currentUserId,
      })
      .select(
        `
        *,
        creator:profiles!discussion_notes_created_by_fkey(full_name)
      `
      )
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to add note.",
        variant: "destructive",
      });
      setIsAddingNote(false);
      return;
    }

    setNotes([data, ...notes]);
    setNewNoteContent("");
    setIsAddingNote(false);
    toast({
      title: "Success",
      description: "Note added successfully!",
    });
    router.refresh();
  };

  const handleEditNote = (note: Note) => {
    setEditingNoteId(note.id);
    setEditContent(note.content);
  };

  const handleSaveEdit = async (noteId: string) => {
    const supabase = createClient();

    const { error } = await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("discussion_notes") as any)
      .update({ content: editContent })
      .eq("id", noteId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update note.",
        variant: "destructive",
      });
      return;
    }

    setNotes(
      notes.map((note) =>
        note.id === noteId ? { ...note, content: editContent } : note
      )
    );
    setEditingNoteId(null);
    toast({
      title: "Success",
      description: "Note updated successfully!",
    });
    router.refresh();
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm("Are you sure you want to delete this note?")) return;

    const supabase = createClient();

    const { error } = await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("discussion_notes") as any)
      .delete()
      .eq("id", noteId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete note.",
        variant: "destructive",
      });
      return;
    }

    setNotes(notes.filter((note) => note.id !== noteId));
    toast({
      title: "Success",
      description: "Note deleted successfully!",
    });
    router.refresh();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notes</CardTitle>
        <CardDescription>
          Discussion timeline and meeting notes ({notes.length} note
          {notes.length !== 1 ? "s" : ""})
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Add Note */}
        <div className="space-y-2">
          <Textarea
            value={newNoteContent}
            onChange={(e) => setNewNoteContent(e.target.value)}
            placeholder="Add a note to this discussion..."
            rows={3}
            disabled={isAddingNote}
          />
          <div className="flex justify-end">
            <Button
              onClick={handleAddNote}
              disabled={isAddingNote || !newNoteContent.trim()}
            >
              {isAddingNote ? "Adding..." : "Add Note"}
            </Button>
          </div>
        </div>

        {/* Notes Timeline */}
        {notes.length > 0 ? (
          <div className="space-y-3 mt-6">
            {notes.map((note) => (
              <div
                key={note.id}
                className="p-4 border rounded-lg bg-card space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="font-medium">
                        {note.creator?.full_name || "Unknown"}
                      </span>
                      <span>•</span>
                      <span>
                        {format(
                          new Date(note.created_at),
                          "MMM d, yyyy 'at' h:mm a"
                        )}
                      </span>
                      {note.meeting && (
                        <>
                          <span>•</span>
                          <span className="text-primary">
                            From: {note.meeting.title}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  {note.created_by === currentUserId && (
                    <div className="flex gap-1">
                      {editingNoteId === note.id ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleSaveEdit(note.id)}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingNoteId(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditNote(note)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteNote(note.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
                {editingNoteId === note.id ? (
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={3}
                  />
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            No notes yet. Add the first note above.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
