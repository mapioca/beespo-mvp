"use client";

import { useCallback, useState } from "react";
import { Clock } from "lucide-react";
import { MeetingTypeBadge } from "@/components/meetings/meeting-type-badge";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";
import { NotesEditor } from "./notes-editor";
import { useConductMeetingStore } from "@/stores/conduct-meeting-store";
import { notesService, defaultEditorData } from "@/lib/conduct/notes-service";
import { cn } from "@/lib/utils";
import { Database } from "@/types/database";
import type { OutputData } from "@editorjs/editorjs";

type AgendaItem = Database["public"]["Tables"]["agenda_items"]["Row"];
type Meeting = Database["public"]["Tables"]["meetings"]["Row"];

interface ConductorViewProps {
  meeting: Meeting;
  items: AgendaItem[];
  onItemComplete: (item: AgendaItem, newStatus: boolean) => Promise<void>;
}

interface AgendaItemCardProps {
  item: AgendaItem;
  index: number;
  meeting: Meeting;
  isNotesExpanded: boolean;
  onToggleComplete: (item: AgendaItem) => void;
  onToggleNotes: (itemId: string) => void;
  notesData: OutputData | null;
  onNotesChange: (itemId: string, data: OutputData) => void;
}

function AgendaItemCard({
  item,
  index,
  meeting,
  isNotesExpanded,
  onToggleComplete,
  onToggleNotes,
  notesData,
  onNotesChange,
}: AgendaItemCardProps) {
  // Count notes blocks (excluding empty paragraphs)
  const notesCount = notesData?.blocks?.filter(
    (block) => block.type !== "paragraph" || block.data?.text?.trim()
  ).length || 0;

  return (
    <div className="mb-8 pb-8 border-b last:border-b-0">
      {/* Header: Number + Title + Type Badge */}
      <div className="flex items-start gap-3 mb-2">
        <span className="text-lg font-semibold text-muted-foreground">
          {index + 1}.
        </span>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-xl font-semibold">{item.title}</h3>
            <MeetingTypeBadge type={item.item_type} className="text-xs" />
            {item.duration_minutes && (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {item.duration_minutes} min
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      {item.description && (
        <p className="text-sm text-muted-foreground ml-8 mb-3">
          {item.description}
        </p>
      )}

      {/* Participant */}
      {item.participant_name && (
        <p className="text-sm text-muted-foreground ml-8 mb-3">
          Assigned to: {item.participant_name}
        </p>
      )}

      {/* Inline Actions */}
      <div className="ml-8 flex items-center gap-4 text-sm no-print">
        <button
          onClick={() => onToggleComplete(item)}
          className={cn(
            "flex items-center gap-1.5 hover:text-foreground transition-colors",
            item.is_completed
              ? "text-green-600 font-medium"
              : "text-muted-foreground"
          )}
        >
          <span className="text-base">{item.is_completed ? "☑" : "☐"}</span>
          {item.is_completed ? "Completed" : "Complete"}
        </button>

        <CreateTaskDialog
          context={{
            meeting_id: meeting.id,
            agenda_item_id: item.id,
            discussion_id: item.discussion_id || undefined,
            business_item_id: item.business_item_id || undefined,
          }}
        >
          <button className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
            <span>+</span> Task
          </button>
        </CreateTaskDialog>

        <button
          onClick={() => onToggleNotes(item.id)}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          📝 Notes {notesCount > 0 && `(${notesCount})`}
        </button>
      </div>

      {/* Expandable Notes Editor */}
      {isNotesExpanded && (
        <div className="ml-8 mt-4 pt-4 border-t">
          <NotesEditor
            key={`item-${item.id}`}
            holderId={`item-notes-${item.id}`}
            data={notesData || defaultEditorData}
            onChange={(data) => onNotesChange(item.id, data)}
            placeholder="Notes for this agenda item..."
          />
        </div>
      )}
    </div>
  );
}

export function ConductorView({
  meeting,
  items,
  onItemComplete,
}: ConductorViewProps) {
  const [expandedNoteItemId, setExpandedNoteItemId] = useState<string | null>(
    null
  );
  const { itemNotes, setItemNotes } = useConductMeetingStore();

  const handleToggleNotes = (itemId: string) => {
    setExpandedNoteItemId((prev) => (prev === itemId ? null : itemId));
  };

  const handleToggleComplete = async (item: AgendaItem) => {
    const newStatus = !item.is_completed;
    await onItemComplete(item, newStatus);
    // NO auto-advance - stay in place
  };

  const handleItemNotesChange = useCallback(
    (itemId: string, data: OutputData) => {
      setItemNotes(itemId, data);
      notesService.queueItemNotes(itemId, data);
    },
    [setItemNotes]
  );

  if (items.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        No agenda items found
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="max-w-[900px] mx-auto px-8 py-12">
        {items.map((item, idx) => (
          <AgendaItemCard
            key={item.id}
            item={item}
            index={idx}
            meeting={meeting}
            isNotesExpanded={expandedNoteItemId === item.id}
            onToggleComplete={handleToggleComplete}
            onToggleNotes={handleToggleNotes}
            notesData={itemNotes[item.id] || null}
            onNotesChange={handleItemNotesChange}
          />
        ))}
      </div>
    </div>
  );
}
