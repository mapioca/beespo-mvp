"use client";

import Link from "next/link";
import {
  Sun,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Plus,
  Sparkles,
  FileText,
} from "lucide-react";
import { differenceInDays, format, isToday, isTomorrow, isThisWeek } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SundayMorningData, DragHandleProps } from "@/types/dashboard";
import { WidgetCard } from "./widget-card";

interface SundayMorningWidgetProps {
  data: SundayMorningData;
  dragHandleProps?: DragHandleProps;
  isDragging?: boolean;
}

function formatMeetingDate(dateStr: string) {
  const date = new Date(dateStr);
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  if (isThisWeek(date)) return format(date, "EEEE");
  return format(date, "EEEE, MMM d");
}

function getDaysUntil(dateStr: string): string {
  const days = differenceInDays(new Date(dateStr), new Date());
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 0) return "Past";
  return `${days}d`;
}

export function SundayMorningWidget({
  data,
  dragHandleProps,
  isDragging,
}: SundayMorningWidgetProps) {
  const { nextMeeting, readiness } = data;

  if (!nextMeeting) {
    return (
      <WidgetCard
        title="Sunday Morning"
        icon={<Sun className="h-4 w-4 text-amber-500" />}
        dragHandleProps={dragHandleProps}
        isDragging={isDragging}
      >
        <div className="py-8 text-center">
          <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles className="h-7 w-7 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            No Upcoming Meetings
          </h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-5">
            Schedule your first meeting to start planning agendas.
          </p>
          <Button asChild size="sm">
            <Link href="/meetings/new">
              <Plus className="h-4 w-4 mr-1.5" />
              Schedule First Meeting
            </Link>
          </Button>
        </div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard
      title="Sunday Morning"
      icon={<Sun className="h-4 w-4 text-amber-500" />}
      dragHandleProps={dragHandleProps}
      isDragging={isDragging}
      className="overflow-hidden"
    >
      {/* Meeting Info */}
      <div className="flex items-start justify-between -mt-1">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">
            {formatMeetingDate(nextMeeting.scheduled_date)}
          </h2>
          <p className="text-lg text-gray-600 mt-0.5">{nextMeeting.title}</p>
          {nextMeeting.template_name && (
            <Badge variant="secondary" className="mt-2">
              <FileText className="h-3 w-3 mr-1" />
              {nextMeeting.template_name}
            </Badge>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="text-4xl font-bold text-primary">
            {getDaysUntil(nextMeeting.scheduled_date)}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">until meeting</p>
        </div>
      </div>

      {/* Readiness Bar */}
      {readiness && (
        <div className="mt-4 p-3 bg-gray-50/80 rounded-lg">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-medium text-gray-700">
              Agenda Readiness
            </span>
            <span
              className={cn(
                "text-sm font-semibold",
                readiness.percent >= 80
                  ? "text-green-600"
                  : readiness.percent >= 50
                    ? "text-amber-600"
                    : "text-red-600"
              )}
            >
              {readiness.label}
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full transition-all duration-500 rounded-full",
                readiness.percent >= 80
                  ? "bg-green-500"
                  : readiness.percent >= 50
                    ? "bg-amber-500"
                    : "bg-red-500"
              )}
              style={{ width: `${readiness.percent}%` }}
            />
          </div>
          {readiness.issues.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {readiness.issues.map((issue, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="text-amber-700 border-amber-300 bg-amber-50 text-xs"
                >
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {issue}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Agenda Preview */}
      <div className="mt-4">
        <p className="text-sm font-medium text-gray-500 mb-2">Agenda Preview</p>
        {nextMeeting.agenda_items.length > 0 ? (
          <ul className="space-y-1.5">
            {nextMeeting.agenda_items.slice(0, 4).map((item) => (
              <li key={item.id} className="flex items-center gap-2.5 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                <span className="text-gray-700 truncate">{item.title}</span>
                {item.participant_name && (
                  <span className="text-gray-400 truncate shrink-0">
                    - {item.participant_name}
                  </span>
                )}
              </li>
            ))}
            {nextMeeting.agenda_items.length > 4 && (
              <li className="text-sm text-muted-foreground pl-7">
                +{nextMeeting.agenda_items.length - 4} more items
              </li>
            )}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            No agenda items yet. Start building your agenda.
          </p>
        )}
      </div>

      {/* CTA */}
      <div className="mt-4 pt-3 border-t">
        <Button asChild size="sm" className="w-full sm:w-auto">
          <Link href={`/meetings/${nextMeeting.id}`}>
            Edit Agenda
            <ChevronRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </div>
    </WidgetCard>
  );
}
