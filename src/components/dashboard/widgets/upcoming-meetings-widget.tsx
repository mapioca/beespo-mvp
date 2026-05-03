"use client";

import Link from "next/link";
import { Calendar, ArrowRight, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { UpcomingMeetingsData, DragHandleProps } from "@/types/dashboard";
import { WidgetCard } from "./widget-card";

interface Props {
  data: UpcomingMeetingsData;
  dragHandleProps?: DragHandleProps;
  isDragging?: boolean;
}

export function UpcomingMeetingsWidget({
  data,
  dragHandleProps,
  isDragging,
}: Props) {
  return (
    <WidgetCard
      title="Upcoming Meetings"
      icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
      dragHandleProps={dragHandleProps}
      isDragging={isDragging}
    >
      {data.meetings.length === 0 ? (
        <div className="py-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-[hsl(var(--dashboard-pill-primary-border))] bg-[hsl(var(--dashboard-pill-primary-bg))]">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <h3 className="mb-1 text-sm font-semibold text-foreground">
            Plan Your Next Quarter
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            You have no upcoming meetings scheduled. Create your first meeting to get started.
          </p>
          <Button asChild size="sm" className="w-full">
            <Link href="/meetings/create">
              <Plus className="h-3 w-3 mr-2" />
              Create Something New
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-1">
          {data.meetings.map((meeting) => (
            <Link
              key={meeting.id}
              href={`/meetings/${meeting.id}`}
              className="dashboard-widget-row dashboard-widget-row-hover -mx-2 flex items-center gap-3 rounded-md px-2 py-2 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {meeting.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(meeting.scheduled_date).toLocaleDateString(
                    "en-US",
                    { weekday: "short", month: "short", day: "numeric" }
                  )}
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-[hsl(var(--dashboard-pill-secondary-border))] bg-[hsl(var(--dashboard-pill-secondary-bg))] px-2 py-0.5 text-[10px] font-semibold text-[hsl(var(--dashboard-pill-secondary-text))]">
                {meeting.agendaItemCount} items
              </span>
            </Link>
          ))}
        </div>
      )}
      {data.meetings.length > 0 && (
        <Link
          href="/meetings/agendas"
          className="mt-3 flex items-center gap-1 border-t pt-3 text-xs font-medium text-[hsl(var(--dashboard-link))] transition-colors hover:text-[hsl(var(--dashboard-link-hover))]"
        >
          View all meetings
          <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </WidgetCard>
  );
}
