"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { CalendarIcon, Loader2, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/lib/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { Database } from "@/types/database";

type Template = Database['public']['Tables']['templates']['Row'];

interface CreateMeetingSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: Template | null;
}

export function CreateMeetingSheet({
  open,
  onOpenChange,
  template,
}: CreateMeetingSheetProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [time, setTime] = useState("07:00");
  const [creating, setCreating] = useState(false);

  // Auto-fill title when template changes
  useEffect(() => {
    if (template && open) {
      setTitle(`${template.name} - ${format(new Date(), "MMM d")}`);
      setDate(new Date());
      setTime("07:00");
    }
  }, [template, open]);

  const handleCreate = async () => {
    if (!template || !date || !title.trim()) return;

    setCreating(true);
    const supabase = createClient();

    try {
      // Combine date and time
      const [hours, minutes] = time.split(":").map(Number);
      const scheduledDate = new Date(date);
      scheduledDate.setHours(hours, minutes);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: meetingId, error } = await (supabase as any).rpc(
        "create_meeting_from_template",
        {
          p_template_id: template.id,
          p_title: title,
          p_scheduled_date: scheduledDate.toISOString(),
        }
      );

      if (error) {
        toast({
          title: "Error creating meeting",
          description: error.message || "Unknown error",
          variant: "destructive",
        });
        setCreating(false);
        return;
      }

      toast({
        title: "Meeting created!",
        description: "Redirecting to meeting details...",
      });

      // Close sheet and redirect
      onOpenChange(false);
      router.push(`/meetings/${meetingId}`);
      router.refresh();
    } catch (error) {
      toast({
        title: "Error creating meeting",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
      setCreating(false);
    }
  };

  if (!template) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px] flex flex-col h-full">
        <SheetHeader className="space-y-2">
          <SheetTitle>Create Meeting from Template</SheetTitle>
          <SheetDescription>
            Schedule a new meeting using the <strong>{template.name}</strong> template
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 py-6">
          {/* Meeting Title */}
          <div className="space-y-2">
            <Label htmlFor="meeting-title">Meeting Title</Label>
            <Input
              id="meeting-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Ward Council - Jan 15"
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={date} onSelect={setDate} />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="meeting-time">Time</Label>
              <Input
                id="meeting-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>

          {/* Info note */}
          <div className="flex gap-3 p-3 border border-blue-200 bg-blue-50/50 rounded-lg text-sm">
            <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-blue-900">
              Pending Business Items and Active Announcements will be automatically
              added to the agenda upon creation.
            </p>
          </div>
        </div>

        <SheetFooter className="flex-shrink-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={creating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={creating || !title.trim() || !date}
          >
            {creating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Meeting"
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
