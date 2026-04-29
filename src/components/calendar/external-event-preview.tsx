"use client";

import { format } from "date-fns";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Rss, Lock, Calendar, Clock, MapPin, FileText } from "lucide-react";
import { parseAllDayDate } from "@/lib/calendar-helpers";

export interface ExternalEventData {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_date: string;
  end_date: string | null;
  is_all_day: boolean;
  external_uid?: string;
  subscription_name?: string;
  subscription_color?: string;
}

interface ExternalEventPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: ExternalEventData | null;
  onImport: (event: ExternalEventData) => void;
  onConvertAsIs: (event: ExternalEventData) => void;
}

export function ExternalEventPreview({
  open,
  onOpenChange,
  event,
  onImport,
  onConvertAsIs,
}: ExternalEventPreviewProps) {
  if (!event) return null;

  const startDate = event.is_all_day
    ? parseAllDayDate(event.start_date)
    : new Date(event.start_date);
  const endDate = event.end_date
    ? (event.is_all_day ? parseAllDayDate(event.end_date) : new Date(event.end_date))
    : null;

  const accentColor = event.subscription_color ?? "#8b5cf6";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-[420px] flex-col gap-0 p-0 sm:max-w-[420px]">
        {/* Header */}
        <SheetHeader className="border-b border-border/40 px-6 py-5">
          <div className="flex items-center gap-2">
            {/* Calendar source chip */}
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
              style={{
                backgroundColor: `color-mix(in srgb, ${accentColor} 12%, transparent)`,
                color: accentColor,
              }}
            >
              <Rss className="h-3 w-3" />
              {event.subscription_name ?? "External Calendar"}
            </span>
            {/* Read-only chip */}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/50 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
              <Lock className="h-3 w-3" />
              Read-only
            </span>
          </div>
          <SheetTitle className="mt-3 font-serif text-[22px] font-normal leading-snug">
            {event.title}
          </SheetTitle>
          <SheetDescription className="sr-only">External calendar event details</SheetDescription>
        </SheetHeader>

        {/* Event details */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-4">
            {/* Date / time */}
            <div className="flex items-start gap-3">
              <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="text-[13.5px]">
                <p className="font-medium text-foreground">
                  {event.is_all_day
                    ? format(startDate, "EEEE, MMMM d, yyyy")
                    : format(startDate, "EEEE, MMMM d, yyyy")}
                </p>
                {!event.is_all_day && (
                  <p className="mt-0.5 text-muted-foreground">
                    {format(startDate, "h:mm a")}
                    {endDate && ` – ${format(endDate, "h:mm a")}`}
                  </p>
                )}
                {event.is_all_day && endDate &&
                  format(startDate, "yyyy-MM-dd") !== format(endDate, "yyyy-MM-dd") && (
                    <p className="mt-0.5 text-muted-foreground">
                      Until {format(endDate, "MMMM d, yyyy")}
                    </p>
                  )}
                {event.is_all_day && (
                  <span className="mt-1 inline-flex items-center gap-1 text-[11.5px] text-muted-foreground">
                    <Clock className="h-3 w-3" /> All day
                  </span>
                )}
              </div>
            </div>

            {/* Location */}
            {event.location && (
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <p className="text-[13.5px] text-foreground">{event.location}</p>
              </div>
            )}

            {/* Description */}
            {event.description && (
              <div className="flex items-start gap-3">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <p className="max-h-40 overflow-y-auto whitespace-pre-wrap text-[13px] text-muted-foreground">
                  {event.description}
                </p>
              </div>
            )}
          </div>

          {/* Convert card */}
          <div className="mt-6 rounded-[10px] border border-border/50 bg-surface-raised p-4">
            <p className="text-[13px] font-semibold text-foreground">
              Bring this onto the calendar
            </p>
            <p className="mt-1.5 text-[12.5px] leading-5 text-muted-foreground">
              External events stay read-only. Convert it into an app event to add attendees,
              edit details, and link it to ward work.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  onConvertAsIs(event);
                  onOpenChange(false);
                }}
                className="flex-1 rounded-[7px] border border-border/60 bg-surface-canvas py-1.5 text-[12.5px] font-medium text-foreground transition-colors hover:bg-surface-hover"
              >
                Convert as-is
              </button>
              <button
                type="button"
                onClick={() => onImport(event)}
                className="flex-1 rounded-[7px] bg-foreground py-1.5 text-[12.5px] font-medium text-background transition-colors hover:opacity-90"
              >
                Edit before adding
              </button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
