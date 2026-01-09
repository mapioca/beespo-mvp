"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/lib/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft,
  Clock,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { getItemTypeLabel, getItemTypeBadgeVariant } from "@/types/agenda";

interface AgendaItem {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number | null;
  item_type: string;
  order_index: number;
  notes: string | null;
  is_completed: boolean;
}

export default function ConductMeetingPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();

  const [meetingTitle, setMeetingTitle] = useState("");
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [startTime] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Debounced save for notes
  const [notesSaveTimeout, setNotesSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadMeeting();

    // Update current time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, [params.id]);

  const loadMeeting = async () => {
    const supabase = createClient();

    // Get meeting details
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: meeting } = await (supabase.from("meetings") as any)
      .select("title")
      .eq("id", params.id)
      .single();

    if (meeting) {
      setMeetingTitle(meeting.title);
    }

    // Get agenda items
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: agendaItems } = await (supabase.from("agenda_items") as any)
      .select("*")
      .eq("meeting_id", params.id)
      .order("order_index");

    if (agendaItems) {
      setItems(agendaItems);
      // Find first incomplete item
      const firstIncomplete = agendaItems.findIndex(
        (item: AgendaItem) => !item.is_completed
      );
      if (firstIncomplete !== -1) {
        setCurrentItemIndex(firstIncomplete);
      }
    }

    setIsLoading(false);
  };

  const saveNotes = useCallback(
    async (itemId: string, notes: string) => {
      const supabase = createClient();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("agenda_items") as any)
        .update({ notes })
        .eq("id", itemId);
    },
    []
  );

  const handleNotesChange = (itemId: string, notes: string) => {
    // Update local state
    setItems(
      items.map((item) =>
        item.id === itemId ? { ...item, notes } : item
      )
    );

    // Debounce save
    if (notesSaveTimeout) {
      clearTimeout(notesSaveTimeout);
    }

    const timeout = setTimeout(() => {
      saveNotes(itemId, notes);
    }, 1000);

    setNotesSaveTimeout(timeout);
  };

  const toggleComplete = async (itemId: string, isCompleted: boolean) => {
    setIsSaving(true);

    try {
      const supabase = createClient();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("agenda_items") as any)
        .update({ is_completed: isCompleted })
        .eq("id", itemId);

      // Update local state
      setItems(
        items.map((item) =>
          item.id === itemId ? { ...item, is_completed: isCompleted } : item
        )
      );

      toast({
        title: isCompleted ? "Item completed" : "Item uncompleted",
        description: "Progress saved",
      });
    } catch (error) {
      console.error("Error updating item:", error);
      toast({
        title: "Error",
        description: "Failed to update item",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleNext = () => {
    if (currentItemIndex < items.length - 1) {
      setCurrentItemIndex(currentItemIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentItemIndex > 0) {
      setCurrentItemIndex(currentItemIndex - 1);
    }
  };

  const handleEndMeeting = async () => {
    const supabase = createClient();

    try {
      // Update meeting status to completed
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("meetings") as any)
        .update({ status: "completed" })
        .eq("id", params.id);

      toast({
        title: "Meeting ended",
        description: "Meeting has been marked as completed",
      });

      router.push(`/meetings/${params.id}`);
      router.refresh();
    } catch (error) {
      console.error("Error ending meeting:", error);
      toast({
        title: "Error",
        description: "Failed to end meeting",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <p>Loading...</p>
      </div>
    );
  }

  const currentItem = items[currentItemIndex];
  const upcomingItems = items.slice(currentItemIndex + 1, currentItemIndex + 4);
  const completedItems = items.filter((item) => item.is_completed);
  const elapsedTime = Math.floor((currentTime.getTime() - startTime.getTime()) / 1000);
  const elapsedMinutes = Math.floor(elapsedTime / 60);
  const elapsedSeconds = elapsedTime % 60;

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      {/* Top Bar */}
      <div className="sticky top-0 z-10 bg-background border-b mb-6 -mx-6 px-6 py-4">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{meetingTitle}</h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {format(currentTime, "h:mm:ss a")}
              </div>
              <div>
                Elapsed: {elapsedMinutes}:{elapsedSeconds.toString().padStart(2, "0")}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/meetings/${params.id}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Exit
              </Link>
            </Button>
            <Button onClick={handleEndMeeting} variant="destructive">
              End Meeting
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content - Current Item */}
        <div className="lg:col-span-2 space-y-6">
          {currentItem ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                      {currentItemIndex + 1}
                    </div>
                    <div>
                      <CardTitle className="text-2xl">{currentItem.title}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={getItemTypeBadgeVariant(currentItem.item_type)}>
                          {getItemTypeLabel(currentItem.item_type)}
                        </Badge>
                        {currentItem.duration_minutes && (
                          <Badge variant="outline">
                            <Clock className="mr-1 h-3 w-3" />
                            {currentItem.duration_minutes} min
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                {currentItem.description && (
                  <CardDescription className="text-base mt-4">
                    {currentItem.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Notes</label>
                    <span className="text-xs text-muted-foreground">
                      Auto-saves as you type
                    </span>
                  </div>
                  <Textarea
                    value={currentItem.notes || ""}
                    onChange={(e) =>
                      handleNotesChange(currentItem.id, e.target.value)
                    }
                    placeholder="Take notes for this agenda item..."
                    rows={8}
                    className="resize-none"
                  />
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="completed"
                      checked={currentItem.is_completed}
                      onCheckedChange={(checked) =>
                        toggleComplete(currentItem.id, checked as boolean)
                      }
                      disabled={isSaving}
                    />
                    <label
                      htmlFor="completed"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Mark as completed
                    </label>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handlePrevious}
                      disabled={currentItemIndex === 0}
                    >
                      Previous
                    </Button>
                    <Button
                      onClick={handleNext}
                      disabled={currentItemIndex === items.length - 1}
                    >
                      Next Item
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No agenda items</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - Upcoming & Completed */}
        <div className="space-y-4">
          {/* Upcoming Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Upcoming</CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingItems.length > 0 ? (
                <div className="space-y-3">
                  {upcomingItems.map((item, idx) => (
                    <div
                      key={item.id}
                      className="p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80"
                      onClick={() => setCurrentItemIndex(currentItemIndex + idx + 1)}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-muted-foreground">
                          {currentItemIndex + idx + 2}.
                        </span>
                        <Badge
                          variant={getItemTypeBadgeVariant(item.item_type)}
                          className="text-xs"
                        >
                          {getItemTypeLabel(item.item_type)}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium">{item.title}</p>
                      {item.duration_minutes && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {item.duration_minutes} min
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No upcoming items</p>
              )}
            </CardContent>
          </Card>

          {/* Completed Items */}
          {completedItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Completed ({completedItems.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {completedItems.map((item) => (
                    <div key={item.id} className="p-3 bg-muted rounded-lg">
                      <p className="text-sm font-medium mb-1">{item.title}</p>
                      {item.notes ? (
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                          {item.notes}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">
                          No notes
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Completed</span>
                  <span className="font-medium">
                    {completedItems.length} / {items.length}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{
                      width: `${(completedItems.length / items.length) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
