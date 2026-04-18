"use client";

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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  Clock,
  MapPin,
  FileText,
  ExternalLink,
  Import,
} from "lucide-react";
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
}

export function ExternalEventPreview({
  open,
  onOpenChange,
  event,
  onImport,
}: ExternalEventPreviewProps) {
  if (!event) return null;

  const startDate = event.is_all_day
    ? parseAllDayDate(event.start_date)
    : new Date(event.start_date);
  const endDate = event.end_date
    ? (event.is_all_day ? parseAllDayDate(event.end_date) : new Date(event.end_date))
    : null;

  const formatDateTime = (date: Date, isAllDay: boolean) => {
    if (isAllDay) {
      return format(date, "EEEE, MMMM d, yyyy");
    }
    return format(date, "EEEE, MMMM d, yyyy 'at' h:mm a");
  };

  const handleImport = () => {
    onImport(event);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Badge
              variant="secondary"
              className="text-[11px] uppercase tracking-[0.2em]"
              style={{
                backgroundColor: event.subscription_color ? `${event.subscription_color}20` : undefined,
                color: event.subscription_color || undefined,
                borderColor: event.subscription_color || undefined,
              }}
            >
              <ExternalLink className="h-3 w-3 mr-1 stroke-[1.6]" />
              External Event
            </Badge>
            {event.subscription_name && (
              <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                from {event.subscription_name}
              </span>
            )}
          </div>
          <DialogTitle className="text-xl">{event.title}</DialogTitle>
          <DialogDescription>
            This event is from an external calendar subscription.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Date & Time */}
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground mt-0.5 stroke-[1.6]" />
            <div>
              <p className="font-medium">
                {formatDateTime(startDate, event.is_all_day)}
              </p>
              {endDate && !event.is_all_day && (
                <p className="text-sm text-muted-foreground">
                  to {format(endDate, "h:mm a")}
                </p>
              )}
              {endDate && event.is_all_day &&
                format(startDate, "yyyy-MM-dd") !== format(endDate, "yyyy-MM-dd") && (
                <p className="text-sm text-muted-foreground">
                  to {format(endDate, "MMMM d, yyyy")}
                </p>
              )}
              {event.is_all_day && (
                <Badge variant="outline" className="mt-1 text-[11px] uppercase tracking-[0.2em] border-border/60">
                  <Clock className="h-3 w-3 mr-1 stroke-[1.6]" />
                  All Day
                </Badge>
              )}
            </div>
          </div>

          {/* Location */}
          {event.location && (
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 stroke-[1.6]" />
              <p className="text-sm">{event.location}</p>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <>
              <Separator className="bg-border/60" />
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-muted-foreground mt-0.5 stroke-[1.6]" />
                <div className="text-sm whitespace-pre-wrap max-h-32 overflow-y-auto">
                  {event.description}
                </div>
              </div>
            </>
          )}
        </div>

        <Separator className="bg-border/60" />

        <div className="bg-muted/35 rounded-lg p-3 text-sm border border-border/50">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-1">
            Want to enrich this event?
          </p>
          <p className="text-muted-foreground text-xs">
            Import it to Beespo to add announcements, link to meetings, and track it alongside your other events.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-border/60 hover:bg-accent shadow-none"
          >
            Close
          </Button>
          <Button onClick={handleImport} className="shadow-none">
            <Import className="h-4 w-4 mr-2 stroke-[1.6]" />
            Import to Beespo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
