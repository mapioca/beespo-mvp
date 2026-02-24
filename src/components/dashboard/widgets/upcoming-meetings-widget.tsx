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
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 mb-1">
            Plan Your Next Quarter
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            You have no upcoming meetings scheduled. Create your first meeting to get started.
          </p>
          <Button asChild size="sm" className="w-full">
            <Link href="/meetings/new">
              <Plus className="h-3 w-3 mr-2" />
              Schedule First Meeting
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-1">
          {data.meetings.map((meeting) => (
            <Link
              key={meeting.id}
              href={`/meetings/${meeting.id}`}
              className="flex items-center gap-3 py-2 px-2 -mx-2 rounded-md hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {meeting.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(meeting.scheduled_date).toLocaleDateString(
                    "en-US",
                    { weekday: "short", month: "short", day: "numeric" }
                  )}
                </p>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 shrink-0">
                {meeting.agendaItemCount} items
              </span>
            </Link>
          ))}
        </div>
      )}
      {data.meetings.length > 0 && (
        <Link
          href="/meetings/overview"
          className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 mt-3 pt-3 border-t"
        >
          View all meetings
          <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </WidgetCard>
  );
}
