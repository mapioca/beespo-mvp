"use client";

import Link from "next/link";
import { Calendar, ArrowRight, Plus } from "lucide-react";
import type { UpcomingMeetingsData, DragHandleProps } from "@/types/dashboard";
import { WidgetCard } from "./widget-card";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("Dashboard.Widgets.upcomingMeetings");

  return (
    <WidgetCard
      title={t("title")}
      icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
      dragHandleProps={dragHandleProps}
      isDragging={isDragging}
    >
      {data.meetings.length === 0 ? (
        <div className="py-4 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            {t("empty")}
          </p>
          <Link
            href="/meetings/new"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80"
          >
            <Plus className="h-3.5 w-3.5" />
            {t("schedule")}
          </Link>
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
                {t("itemsCount", { count: meeting.agendaItemCount })}
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
          {t("viewAll")}
          <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </WidgetCard>
  );
}
