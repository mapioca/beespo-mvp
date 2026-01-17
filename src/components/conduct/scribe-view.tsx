"use client";

import { useState, useCallback, useEffect } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MeetingTypeBadge } from "@/components/meetings/meeting-type-badge";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";
import { NotesEditor } from "./notes-editor";
import { TimestampButton } from "./timestamp-button";
import { CompactItemTimer } from "./item-timer";
import { useConductMeetingStore } from "@/stores/conduct-meeting-store";
import { notesService, defaultEditorData } from "@/lib/conduct/notes-service";
import { cn } from "@/lib/utils";
import { Database } from "@/types/database";
import type { OutputData } from "@editorjs/editorjs";

type AgendaItem = Database["public"]["Tables"]["agenda_items"]["Row"];
type Meeting = Database["public"]["Tables"]["meetings"]["Row"];

interface ScribeViewProps {
  meeting: Meeting;
  items: AgendaItem[];
  onItemComplete: (item: AgendaItem, newStatus: boolean) => Promise<void>;
}

type NotesTab = "global" | "item";

export function ScribeView({
  meeting,
  items,
  onItemComplete,
}: ScribeViewProps) {
  const {
    activeItemIndex,
    setActiveItem,
    globalNotes,
    itemNotes,
    setGlobalNotes,
    setItemNotes,
  } = useConductMeetingStore();

  const [activeTab, setActiveTab] = useState<NotesTab>("item");
  const currentItem = items[activeItemIndex];

  // Load notes from database on mount
  useEffect(() => {
    const loadNotes = async () => {
      // Load global notes
      const globalData = await notesService.loadGlobalNotes(meeting.id);
      if (globalData) {
        setGlobalNotes(globalData);
      }

      // Load item notes for all items
      for (const item of items) {
        if (item.notes) {
          setItemNotes(item.id, item.notes as OutputData);
        }
      }
    };

    loadNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meeting.id]);

  const handleNavigate = (direction: "prev" | "next") => {
    const newIndex =
      direction === "prev"
        ? Math.max(0, activeItemIndex - 1)
        : Math.min(items.length - 1, activeItemIndex + 1);

    if (newIndex !== activeItemIndex) {
      // Save current notes before navigating
      notesService.flushAll();
      setActiveItem(items[newIndex].id, newIndex);
    }
  };

  const handleSelectItem = (item: AgendaItem, index: number) => {
    // Save current notes before switching
    notesService.flushAll();
    setActiveItem(item.id, index);
  };

  const handleGlobalNotesChange = useCallback(
    (data: OutputData) => {
      setGlobalNotes(data);
      notesService.queueGlobalNotes(meeting.id, data);
    },
    [meeting.id, setGlobalNotes]
  );

  const handleItemNotesChange = useCallback(
    (data: OutputData) => {
      if (!currentItem) return;
      setItemNotes(currentItem.id, data);
      notesService.queueItemNotes(currentItem.id, data);
    },
    [currentItem, setItemNotes]
  );

  const handleToggleComplete = async () => {
    if (!currentItem) return;
    // Save notes before marking complete
    await notesService.flushAll();
    const newStatus = !currentItem.is_completed;
    await onItemComplete(currentItem, newStatus);

    // Auto-advance if marking complete and not at the end
    if (newStatus && activeItemIndex < items.length - 1) {
      const nextIndex = activeItemIndex + 1;
      setActiveItem(items[nextIndex].id, nextIndex);
    }
  };

  const handleTimestampInsert = (block: OutputData["blocks"][0]) => {
    // Insert timestamp into the currently active notes tab
    const currentData = activeTab === "global"
      ? globalNotes || defaultEditorData
      : itemNotes[currentItem?.id || ""] || defaultEditorData;

    const newData: OutputData = {
      ...currentData,
      time: Date.now(),
      blocks: [...currentData.blocks, block],
    };

    if (activeTab === "global") {
      handleGlobalNotesChange(newData);
    } else if (currentItem) {
      handleItemNotesChange(newData);
    }
  };

  if (!currentItem) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        No agenda items found
      </div>
    );
  }

  const currentItemNotes = itemNotes[currentItem.id] || defaultEditorData;

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left Panel: Agenda Items */}
      <div className="w-80 border-r bg-muted/10 overflow-y-auto hidden md:block">
        <div className="p-4">
          <h3 className="font-semibold text-sm text-muted-foreground mb-4 uppercase tracking-wider">
            Agenda Items
          </h3>
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div
                key={item.id}
                onClick={() => handleSelectItem(item, idx)}
                className={cn(
                  "p-3 rounded-lg border text-sm cursor-pointer hover:bg-accent transition-colors",
                  idx === activeItemIndex
                    ? "bg-accent border-primary ring-1 ring-primary"
                    : "bg-card",
                  item.is_completed && "opacity-50"
                )}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-medium line-clamp-2">{item.title}</span>
                  {item.is_completed && (
                    <Check className="w-3 h-3 text-green-600 flex-shrink-0" />
                  )}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <MeetingTypeBadge type={item.item_type} className="text-[10px] px-1.5 py-0" />
                  {item.duration_minutes && <span>{item.duration_minutes}m</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel: Notes Editor */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Current Item Header */}
        <div className="border-b p-4 bg-card">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-muted-foreground/50">
                #{activeItemIndex + 1}
              </span>
              <MeetingTypeBadge type={currentItem.item_type} />
              <h2 className="font-semibold">{currentItem.title}</h2>
            </div>
            <div className="flex items-center gap-2">
              <CompactItemTimer
                meetingId={meeting.id}
                itemId={currentItem.id}
                allocatedMinutes={currentItem.duration_minutes}
              />
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleNavigate("prev")}
                  disabled={activeItemIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleNavigate("next")}
                  disabled={activeItemIndex === items.length - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          {currentItem.description && (
            <p className="text-sm text-muted-foreground">{currentItem.description}</p>
          )}
        </div>

        {/* Notes Tabs */}
        <div className="flex-1 flex flex-col overflow-hidden p-4">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as NotesTab)}
            className="flex-1 flex flex-col"
          >
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="item">Item Notes</TabsTrigger>
                <TabsTrigger value="global">Meeting Notes</TabsTrigger>
              </TabsList>
              <TimestampButton onInsert={handleTimestampInsert} />
            </div>

            <TabsContent value="item" className="flex-1 mt-0 overflow-auto">
              <NotesEditor
                key={`item-${currentItem.id}`}
                holderId={`item-notes-${currentItem.id}`}
                data={currentItemNotes}
                onChange={handleItemNotesChange}
                placeholder="Notes for this agenda item..."
                minHeight="400px"
              />
            </TabsContent>

            <TabsContent value="global" className="flex-1 mt-0 overflow-auto">
              <NotesEditor
                key={`global-${meeting.id}`}
                holderId={`global-notes-${meeting.id}`}
                data={globalNotes || defaultEditorData}
                onChange={handleGlobalNotesChange}
                placeholder="General meeting notes..."
                minHeight="400px"
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Bottom Actions */}
        <div className="border-t p-4 bg-card flex gap-2">
          <Button
            size="sm"
            className={cn(
              "flex-1 transition-all",
              currentItem.is_completed && "bg-green-600 hover:bg-green-700"
            )}
            onClick={handleToggleComplete}
          >
            {currentItem.is_completed ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Completed
              </>
            ) : (
              "Mark as Complete"
            )}
          </Button>

          <CreateTaskDialog
            context={{
              meeting_id: meeting.id,
              agenda_item_id: currentItem.id,
              discussion_id: currentItem.discussion_id || undefined,
              business_item_id: currentItem.business_item_id || undefined,
            }}
          >
            <Button size="sm" variant="outline">
              + Task
            </Button>
          </CreateTaskDialog>
        </div>
      </div>
    </div>
  );
}
