"use client";

import { Check, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MeetingTypeBadge } from "@/components/meetings/meeting-type-badge";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";
import { ItemTimer } from "./item-timer";
import { useConductMeetingStore } from "@/stores/conduct-meeting-store";
import { cn } from "@/lib/utils";
import { Database } from "@/types/database";

type AgendaItem = Database["public"]["Tables"]["agenda_items"]["Row"];
type Meeting = Database["public"]["Tables"]["meetings"]["Row"];

interface ConductorViewProps {
  meeting: Meeting;
  items: AgendaItem[];
  onItemComplete: (item: AgendaItem, newStatus: boolean) => Promise<void>;
}

export function ConductorView({
  meeting,
  items,
  onItemComplete,
}: ConductorViewProps) {
  const { activeItemIndex, setActiveItem } = useConductMeetingStore();

  const currentItem = items[activeItemIndex];

  const handleNavigate = (direction: "prev" | "next") => {
    const newIndex =
      direction === "prev"
        ? Math.max(0, activeItemIndex - 1)
        : Math.min(items.length - 1, activeItemIndex + 1);

    if (newIndex !== activeItemIndex) {
      setActiveItem(items[newIndex].id, newIndex);
    }
  };

  const handleSelectItem = (item: AgendaItem, index: number) => {
    setActiveItem(item.id, index);
  };

  const handleToggleComplete = async () => {
    if (!currentItem) return;
    const newStatus = !currentItem.is_completed;
    await onItemComplete(currentItem, newStatus);

    // Auto-advance if marking complete and not at the end
    if (newStatus && activeItemIndex < items.length - 1) {
      const nextIndex = activeItemIndex + 1;
      setActiveItem(items[nextIndex].id, nextIndex);
    }
  };

  if (!currentItem) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        No agenda items found
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Main Content Area */}
      <div className="flex-1 p-8 overflow-y-auto flex flex-col max-w-4xl mx-auto w-full">
        {/* Item Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="text-4xl font-bold text-muted-foreground/30">
              #{activeItemIndex + 1}
            </span>
            <MeetingTypeBadge
              type={currentItem.item_type}
              className="text-base px-3 py-0.5"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleNavigate("prev")}
              disabled={activeItemIndex === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleNavigate("next")}
              disabled={activeItemIndex === items.length - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Item Content + Timer */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1">
          {/* Left: Item Details */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="text-3xl font-bold mb-2">{currentItem.title}</h2>
              {currentItem.duration_minutes && (
                <div className="flex items-center text-muted-foreground text-sm mb-4">
                  <Clock className="w-4 h-4 mr-2" />
                  Planned: {currentItem.duration_minutes} min
                </div>
              )}
              {currentItem.description && (
                <p className="text-lg text-muted-foreground bg-muted/30 p-4 rounded-lg border">
                  {currentItem.description}
                </p>
              )}
            </div>

            {/* Participant Name if available */}
            {currentItem.participant_name && (
              <div className="bg-muted/20 p-4 rounded-lg border">
                <span className="text-sm text-muted-foreground">Assigned to:</span>
                <p className="text-lg font-medium">{currentItem.participant_name}</p>
              </div>
            )}
          </div>

          {/* Right: Timer */}
          <div className="flex flex-col items-center justify-center">
            <ItemTimer
              meetingId={meeting.id}
              itemId={currentItem.id}
              allocatedMinutes={currentItem.duration_minutes}
              size="lg"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="pt-6 border-t mt-auto flex gap-2">
          <Button
            size="lg"
            className={cn(
              "flex-1 transition-all",
              currentItem.is_completed && "bg-green-600 hover:bg-green-700"
            )}
            onClick={handleToggleComplete}
          >
            {currentItem.is_completed ? (
              <>
                <Check className="mr-2 h-5 w-5" />
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
            <Button size="lg" variant="outline">
              <span className="mr-2">+</span> Assign Task
            </Button>
          </CreateTaskDialog>
        </div>
      </div>

      {/* Sidebar: Up Next */}
      <div className="w-80 border-l bg-muted/10 overflow-y-auto p-4 hidden lg:block">
        <h3 className="font-semibold text-sm text-muted-foreground mb-4 uppercase tracking-wider">
          Agenda Items
        </h3>
        <div className="space-y-3">
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
                <span>{getItemTypeLabel(item.item_type)}</span>
                {item.duration_minutes && <span>{item.duration_minutes}m</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function getItemTypeLabel(type: string): string {
  const map: Record<string, string> = {
    procedural: "Procedural",
    discussion: "Discussion",
    business: "Business",
    announcement: "Announcement",
    speaker: "Speaker",
  };
  return map[type] || type;
}
