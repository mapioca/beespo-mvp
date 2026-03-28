"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/toast";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Trash2, Edit2, Save, X, Send, Loader2 } from "lucide-react";
import { logDiscussionActivity } from "@/lib/actions/discussion-actions";

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

function UserInitial({ name }: { name?: string }) {
  const initial = name ? name.charAt(0).toUpperCase() : "?";
  return (
    <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
      <span className="text-xs font-medium text-muted-foreground">{initial}</span>
    </div>
  );
}

export function DiscussionNotesSection({
  discussionId,
  initialNotes,
  currentUserId,
}: DiscussionNotesSectionProps) {
  const router = useRouter();
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
      .select(`*, creator:profiles!discussion_notes_created_by_fkey(full_name)`)
      .single();

    if (error) {
      toast.error("Failed to add note.");
      setIsAddingNote(false);
      return;
    }

    setNotes([...notes, data]);
    setNewNoteContent("");
    setIsAddingNote(false);
    logDiscussionActivity(discussionId, "note_added");
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
      toast.error("Failed to update note.");
      return;
    }

    setNotes(notes.map((n) => (n.id === noteId ? { ...n, content: editContent } : n)));
    setEditingNoteId(null);
    logDiscussionActivity(discussionId, "note_updated");
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
      toast.error("Failed to delete note.");
      return;
    }

    setNotes(notes.filter((n) => n.id !== noteId));
    logDiscussionActivity(discussionId, "note_deleted");
    router.refresh();
  };

  return (
    <div>
      <p className="text-sm font-semibold mb-4">Notes</p>

      {/* Notes timeline — ascending, oldest first */}
      {notes.length > 0 && (
        <div className="space-y-5 mb-6">
          {notes.map((note) => (
            <div key={note.id} className="flex gap-3 group">
              <UserInitial name={note.creator?.full_name} />

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-sm font-medium">
                    {note.creator?.full_name || "Unknown"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                  </span>
                  {note.meeting && (
                    <span className="text-xs text-muted-foreground">
                      · from {note.meeting.title}
                    </span>
                  )}
                  {note.created_by === currentUserId && (
                    <div className="ml-auto flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {editingNoteId === note.id ? (
                        <>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleSaveEdit(note.id)}>
                            <Save className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingNoteId(null)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEditNote(note)}>
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => handleDeleteNote(note.id)}>
                            <Trash2 className="h-3 w-3" />
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
                    className="text-sm"
                  />
                ) : (
                  <p className="text-sm text-foreground/80 whitespace-pre-wrap">{note.content}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {notes.length === 0 && (
        <p className="text-sm text-muted-foreground mb-6">
          No notes yet. Add the first one below.
        </p>
      )}

      {/* Add note input */}
      <div className="border rounded-lg overflow-hidden">
        <Textarea
          value={newNoteContent}
          onChange={(e) => setNewNoteContent(e.target.value)}
          placeholder="Add a note..."
          rows={3}
          disabled={isAddingNote}
          className="border-0 focus-visible:ring-0 resize-none rounded-none text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAddNote();
          }}
        />
        <div className="flex items-center justify-end px-3 py-2 border-t bg-muted/30">
          <Button
            size="sm"
            onClick={handleAddNote}
            disabled={isAddingNote || !newNoteContent.trim()}
            className="h-7 text-xs gap-1.5"
          >
            {isAddingNote ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
            Add Note
          </Button>
        </div>
      </div>
    </div>
  );
}
