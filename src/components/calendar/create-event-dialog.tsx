"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { useTranslations } from "next-intl";
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
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/lib/toast";
import { createClient } from "@/lib/supabase/client";
import { Megaphone, CalendarDays, MapPin, X } from "lucide-react";

// Event type returned from API
export interface CalendarEventData {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_at: string;
  end_at: string;
  is_all_day: boolean;
  workspace_event_id: string | null;
  external_source_id: string | null;
  external_source_type: string | null;
  announcements?: Array<{ id: string; title: string; status: string }> | null;
}

interface TemplateStub {
  id: string;
  name: string;
}

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date | null;
  onCreated: (event: CalendarEventData) => void;
  // For importing external events
  externalEvent?: {
    id: string;
    title: string;
    description: string | null;
    location: string | null;
    start_date: string;
    end_date: string | null;
    is_all_day: boolean;
    external_uid?: string;
  } | null;
}

export function CreateEventDialog({
  open,
  onOpenChange,
  selectedDate,
  onCreated,
  externalEvent,
}: CreateEventDialogProps) {
  const t = useTranslations("Calendar");
  const tDash = useTranslations("Dashboard");
  const tNav = useTranslations("Navigation");

  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("10:00");
  const [isAllDay, setIsAllDay] = useState(false);

  // Promotion state
  const [promoteToAnnouncement, setPromoteToAnnouncement] = useState(false);
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [templates, setTemplates] = useState<TemplateStub[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Initialize form when selectedDate or externalEvent changes
  useEffect(() => {
    if (externalEvent) {
      // Pre-fill from external event
      setTitle(externalEvent.title);
      setDescription(externalEvent.description || "");
      setLocation(externalEvent.location || "");
      setIsAllDay(externalEvent.is_all_day);

      const start = new Date(externalEvent.start_date);
      setStartDate(format(start, "yyyy-MM-dd"));
      setStartTime(format(start, "HH:mm"));

      if (externalEvent.end_date) {
        const end = new Date(externalEvent.end_date);
        setEndDate(format(end, "yyyy-MM-dd"));
        setEndTime(format(end, "HH:mm"));
      } else {
        setEndDate(format(start, "yyyy-MM-dd"));
        setEndTime(format(start, "HH:mm"));
      }
    } else if (selectedDate) {
      // Initialize from selected date
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      setStartDate(dateStr);
      setEndDate(dateStr);
      setTitle("");
      setDescription("");
      setLocation("");
      setStartTime("09:00");
      setEndTime("10:00");
      setIsAllDay(false);
    }
    setPromoteToAnnouncement(false);
    setSelectedTemplates([]);
  }, [selectedDate, externalEvent, open]);

  // Fetch templates when promotion is enabled
  useEffect(() => {
    const fetchTemplates = async () => {
      if (!promoteToAnnouncement) return;

      setLoadingTemplates(true);
      const supabase = createClient();

      const { data, error } = await supabase
        .from("templates")
        .select("id, name")
        .order("name");

      if (error) {
        console.error("Error fetching templates:", error);
      } else {
        setTemplates(data || []);
      }
      setLoadingTemplates(false);
    };

    fetchTemplates();
  }, [promoteToAnnouncement]);

  // Reset form
  const resetForm = () => {
    const today = format(new Date(), "yyyy-MM-dd");
    setTitle("");
    setDescription("");
    setLocation("");
    setStartDate(today);
    setStartTime("09:00");
    setEndDate(today);
    setEndTime("10:00");
    setIsAllDay(false);
    setPromoteToAnnouncement(false);
    setSelectedTemplates([]);
  };

  // Handle template toggle
  const toggleTemplate = (templateId: string) => {
    setSelectedTemplates((prev) =>
      prev.includes(templateId)
        ? prev.filter((id) => id !== templateId)
        : [...prev, templateId]
    );
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Construct start_at and end_at timestamps
    const startAt = isAllDay
      ? `${startDate}T00:00:00`
      : `${startDate}T${startTime}:00`;
    const endAt = isAllDay
      ? `${endDate}T23:59:59`
      : `${endDate}T${endTime}:00`;

    const payload: Record<string, unknown> = {
      title,
      description: description || null,
      location: location || null,
      start_at: new Date(startAt).toISOString(),
      end_at: new Date(endAt).toISOString(),
      is_all_day: isAllDay,
      promote_to_announcement: promoteToAnnouncement,
    };

    // Add external source info if importing
    if (externalEvent?.external_uid) {
      payload.external_source_id = externalEvent.external_uid;
      payload.external_source_type = "ics"; // Default to ICS for now
    }

    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t("Event.errorCreate"));
      }

      // If promotion is enabled and templates selected, link to templates
      if (promoteToAnnouncement && selectedTemplates.length > 0 && data.announcement) {
        const supabase = createClient();

        // Create announcement_templates entries
        for (const templateId of selectedTemplates) {
          await (supabase
            .from("announcement_templates") as ReturnType<typeof supabase.from>)
            .insert({
              announcement_id: data.announcement.id,
              template_id: templateId,
            });
        }
      }

      toast.success(externalEvent
        ? t("Event.importSuccess")
        : t("Event.successCreate"));

      if (data.announcement) {
        toast.success(tNav("announcements"), { description: t("Event.successCreate") });
      }

      onCreated(data.event);
      onOpenChange(false);
      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("Event.errorCreate"));
    } finally {
      setIsLoading(false);
    }
  };

  const isImporting = !!externalEvent;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            {isImporting ? t("Event.importToBeespo") : t("Event.create")}
          </DialogTitle>
          <DialogDescription>
            {isImporting
              ? t("Event.externalEventDescription")
              : t("clickToAdd")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">{t("Event.title")} *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("Event.title")}
              maxLength={200}
              required
              disabled={isLoading}
            />
          </div>

          {/* All Day Toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="isAllDay" className="cursor-pointer">{t("Event.allDay")}</Label>
            <Switch
              id="isAllDay"
              checked={isAllDay}
              onCheckedChange={setIsAllDay}
              disabled={isLoading}
            />
          </div>

          {/* Start Date/Time */}
          <div className={`grid gap-4 ${isAllDay ? "grid-cols-1" : "grid-cols-2"}`}>
            <div className="space-y-2">
              <Label htmlFor="startDate">{t("Event.start")} (Date) *</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            {!isAllDay && (
              <div className="space-y-2">
                <Label htmlFor="startTime">{t("Event.start")} (Time) *</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
            )}
          </div>

          {/* End Date/Time */}
          <div className={`grid gap-4 ${isAllDay ? "grid-cols-1" : "grid-cols-2"}`}>
            <div className="space-y-2">
              <Label htmlFor="endDate">{t("Event.end")} (Date) *</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            {!isAllDay && (
              <div className="space-y-2">
                <Label htmlFor="endTime">{t("Event.end")} (Time) *</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
            )}
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location" className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {t("Event.location")}
            </Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={t("Event.location")}
              disabled={isLoading}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">{t("Event.description")}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("Event.description")}
              rows={3}
              disabled={isLoading}
            />
          </div>

          <Separator />

          {/* Announce in Meetings Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-amber-500" />
                <Label htmlFor="promoteToAnnouncement" className="cursor-pointer font-medium">
                  {tDash("Layout.Sidebar.apps")} {tNav("announcements")}
                </Label>
              </div>
              <Switch
                id="promoteToAnnouncement"
                checked={promoteToAnnouncement}
                onCheckedChange={setPromoteToAnnouncement}
                disabled={isLoading}
              />
            </div>

            {promoteToAnnouncement && (
              <div className="space-y-3 pl-6 border-l-2 border-amber-200">
                <p className="text-sm text-muted-foreground">
                  {t("Event.externalEventDescription")}
                </p>

                {/* Template Selection */}
                <div className="space-y-2">
                  <Label className="text-sm">{tDash("MainPage.meetingTemplates")}</Label>
                  <p className="text-xs text-muted-foreground">
                    {tDash("Teams.descriptionLabel")}
                  </p>

                  {loadingTemplates ? (
                    <p className="text-sm text-muted-foreground">{t("Event.loading")}</p>
                  ) : templates.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{tDash("Apps.noAppsAvailable")}</p>
                  ) : (
                    <div className="space-y-2">
                      {/* Selected templates as badges */}
                      {selectedTemplates.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {selectedTemplates.map((id) => {
                            const template = templates.find((t) => t.id === id);
                            return template ? (
                              <Badge
                                key={id}
                                variant="secondary"
                                className="cursor-pointer"
                                onClick={() => toggleTemplate(id)}
                              >
                                {template.name}
                                <X className="h-3 w-3 ml-1" />
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      )}

                      {/* Template checkboxes */}
                      <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 border rounded-md">
                        {templates.map((template) => (
                          <div key={template.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`template-${template.id}`}
                              checked={selectedTemplates.includes(template.id)}
                              onCheckedChange={() => toggleTemplate(template.id)}
                              disabled={isLoading}
                            />
                            <Label
                              htmlFor={`template-${template.id}`}
                              className="text-sm cursor-pointer"
                            >
                              {template.name}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              {t("Event.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !title || !startDate || !endDate}
            >
              {isLoading
                ? t("Event.loading")
                : isImporting
                  ? t("Event.importToBeespo")
                  : t("Event.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
