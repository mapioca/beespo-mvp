"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RecurrencePicker } from "./recurrence-picker";
import { CalendarAnnouncement } from "@/lib/calendar-helpers";
import { RecurrenceType, RecurrenceConfig } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/lib/hooks/use-toast";

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date | null;
  onCreated: (announcement: CalendarAnnouncement) => void;
}

export function CreateEventDialog({
  open,
  onOpenChange,
  selectedDate,
  onCreated,
}: CreateEventDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [status, setStatus] = useState<"draft" | "active">("active");
  const [scheduleDate, setScheduleDate] = useState("");
  const [deadline, setDeadline] = useState("");
  const [sameAsSchedule, setSameAsSchedule] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>("none");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("");
  const [recurrenceConfig, setRecurrenceConfig] = useState<RecurrenceConfig>({});

  // Update schedule date when selectedDate changes
  useState(() => {
    if (selectedDate) {
      setScheduleDate(format(selectedDate, "yyyy-MM-dd"));
    }
  });

  // Handle "same as schedule" checkbox
  const handleSameAsScheduleChange = (checked: boolean) => {
    setSameAsSchedule(checked);
    if (checked && scheduleDate) {
      setDeadline(scheduleDate);
    }
  };

  // Handle schedule date change
  const handleScheduleDateChange = (value: string) => {
    setScheduleDate(value);
    if (sameAsSchedule) {
      setDeadline(value);
    }
  };

  // Reset form
  const resetForm = () => {
    setTitle("");
    setContent("");
    setPriority("medium");
    setStatus("active");
    setScheduleDate(selectedDate ? format(selectedDate, "yyyy-MM-dd") : "");
    setDeadline("");
    setSameAsSchedule(false);
    setRecurrenceType("none");
    setRecurrenceEndDate("");
    setRecurrenceConfig({});
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const supabase = createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Error",
        description: "Not authenticated. Please log in again.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Get user profile
    const { data: profile } = await (supabase
      .from("profiles") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      .select("workspace_id, role")
      .eq("id", user.id)
      .single();

    if (!profile || !["leader", "admin"].includes(profile.role)) {
      toast({
        title: "Error",
        description: "Only leaders and admins can create announcements.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Create announcement
    const { data: announcement, error } = await (supabase
      .from("announcements") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      .insert({
        title,
        content: content || null,
        priority,
        status,
        schedule_date: scheduleDate ? new Date(scheduleDate).toISOString() : null,
        deadline: deadline || null,
        recurrence_type: recurrenceType,
        recurrence_end_date: recurrenceEndDate || null,
        recurrence_config: recurrenceConfig,
        workspace_id: profile.workspace_id,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to create announcement.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    toast({
      title: "Success",
      description: "Announcement created and added to calendar.",
    });

    onCreated(announcement);
    resetForm();
    setIsLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Calendar Event</DialogTitle>
          <DialogDescription>
            Create a new announcement that will appear on the calendar.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title"
              maxLength={200}
              required
              disabled={isLoading}
            />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content">Description</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Event details..."
              rows={3}
              disabled={isLoading}
            />
          </div>

          {/* Schedule Date */}
          <div className="space-y-2">
            <Label htmlFor="scheduleDate">Schedule Date *</Label>
            <Input
              id="scheduleDate"
              type="date"
              value={scheduleDate}
              onChange={(e) => handleScheduleDateChange(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          {/* Priority & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as typeof priority)}
                disabled={isLoading}
              >
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as typeof status)}
                disabled={isLoading}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Deadline */}
          <div className="space-y-2">
            <Label htmlFor="deadline">Deadline</Label>
            <div className="flex items-center gap-2">
              <Input
                id="deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                disabled={isLoading || sameAsSchedule}
                className="flex-1"
              />
            </div>
            <div className="flex items-center space-x-2 mt-2">
              <Checkbox
                id="sameAsSchedule"
                checked={sameAsSchedule}
                onCheckedChange={handleSameAsScheduleChange}
                disabled={isLoading}
              />
              <Label htmlFor="sameAsSchedule" className="text-sm cursor-pointer">
                Set deadline same as schedule date
              </Label>
            </div>
          </div>

          {/* Recurrence */}
          <RecurrencePicker
            recurrenceType={recurrenceType}
            recurrenceEndDate={recurrenceEndDate}
            recurrenceConfig={recurrenceConfig}
            onRecurrenceTypeChange={setRecurrenceType}
            onRecurrenceEndDateChange={setRecurrenceEndDate}
            onRecurrenceConfigChange={setRecurrenceConfig}
            disabled={isLoading}
          />

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !title || !scheduleDate}>
              {isLoading ? "Creating..." : "Create Event"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
