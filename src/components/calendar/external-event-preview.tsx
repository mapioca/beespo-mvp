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
import { useTranslations, useLocale } from "next-intl";
import { es, enUS } from "date-fns/locale";

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
  const t = useTranslations("Calendar");
  const tEvent = useTranslations("Calendar.Event");
  const tPreview = useTranslations("Calendar.ExternalPreview");
  const locale = useLocale();
  const dateLocale = locale === "es" ? es : enUS;

  if (!event) return null;

  const startDate = new Date(event.start_date);
  const endDate = event.end_date ? new Date(event.end_date) : null;

  const formatDateTime = (date: Date, isAllDay: boolean) => {
    if (isAllDay) {
      return format(date, "EEEE, MMMM d, yyyy", { locale: dateLocale });
    }
    return format(date, `EEEE, MMMM d, yyyy '${tPreview("at")}' h:mm a`, { locale: dateLocale });
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
              className="text-xs"
              style={{
                backgroundColor: event.subscription_color ? `${event.subscription_color}20` : undefined,
                color: event.subscription_color || undefined,
                borderColor: event.subscription_color || undefined,
              }}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              {tEvent("externalEventBadge")}
            </Badge>
            {event.subscription_name && (
              <span className="text-xs text-muted-foreground">
                {tPreview("from", { name: event.subscription_name })}
              </span>
            )}
          </div>
          <DialogTitle className="text-xl">{event.title}</DialogTitle>
          <DialogDescription>
            {tEvent("externalEventDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Date & Time */}
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium">
                {formatDateTime(startDate, event.is_all_day)}
              </p>
              {endDate && !event.is_all_day && (
                <p className="text-sm text-muted-foreground">
                  {tPreview("to")} {format(endDate, "h:mm a", { locale: dateLocale })}
                </p>
              )}
              {endDate && event.is_all_day &&
                format(startDate, "yyyy-MM-dd") !== format(endDate, "yyyy-MM-dd") && (
                  <p className="text-sm text-muted-foreground">
                    {tPreview("to")} {format(endDate, "MMMM d, yyyy", { locale: dateLocale })}
                  </p>
                )}
              {event.is_all_day && (
                <Badge variant="outline" className="mt-1 text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  {t("allDay")}
                </Badge>
              )}
            </div>
          </div>

          {/* Location */}
          {event.location && (
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <p className="text-sm">{event.location}</p>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <>
              <Separator />
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="text-sm whitespace-pre-wrap max-h-32 overflow-y-auto">
                  {event.description}
                </div>
              </div>
            </>
          )}
        </div>

        <Separator />

        <div className="bg-muted/50 rounded-lg p-3 text-sm">
          <p className="font-medium mb-1">{tPreview("enrichTitle")}</p>
          <p className="text-muted-foreground text-xs">
            {tPreview("enrichDescription")}
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {tEvent("cancel")}
          </Button>
          <Button onClick={handleImport}>
            <Import className="h-4 w-4 mr-2" />
            {tEvent("importToBeespo")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

