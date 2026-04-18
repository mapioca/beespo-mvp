"use client";

import Link from "next/link";
import { CalendarDays, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HomeWeekMeeting } from "@/lib/dashboard/home-data-fetchers";

interface HomeWeekCalendarProps {
  meetings: HomeWeekMeeting[];
}

function formatTimelineDate(dateStr: string) {
  // Try to parse locally
  const d = new Date(dateStr);
  const now = new Date();
  
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  const isTomorrow =
    d.getDate() === now.getDate() + 1 &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  const monthStr = d.toLocaleDateString("en-US", { month: "short" });
  const dayName = d.toLocaleDateString("en-US", { weekday: "long" });
  const dayNum = d.getDate();

  if (isToday) {
    return { prefix: "Today", suffix: `${monthStr} ${dayNum}`, isToday: true };
  }
  if (isTomorrow) {
    return { prefix: "Tomorrow", suffix: `${monthStr} ${dayNum}`, isToday: false };
  }
  return { prefix: dayName, suffix: `${monthStr} ${dayNum}`, isToday: false };
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function HomeWeekCalendar({ meetings }: HomeWeekCalendarProps) {
  if (meetings.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center rounded-[12px] border border-[hsl(var(--cp-border))] bg-[hsl(var(--cp-surface))]">
        <CalendarDays className="h-7 w-7 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">No meetings scheduled this week.</p>
        <Link
          href="/meetings/new"
          className="text-xs text-[hsl(var(--cp-primary))] hover:underline"
        >
          Schedule one →
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-[12px] border border-[hsl(var(--cp-border))] bg-[hsl(var(--cp-surface))] overflow-hidden">
      {meetings.map((m, index) => {
        const { prefix, suffix, isToday } = formatTimelineDate(m.scheduled_date);
        const startTime = formatTime(m.scheduled_date);

        return (
          <div
            key={m.id}
            className={cn(
              "flex group",
              index !== meetings.length - 1 && "border-b border-[hsl(var(--cp-border))]"
            )}
          >
            {/* Left column: Date */}
            <div className="w-[140px] shrink-0 p-4 pt-4 text-[13px] font-medium leading-snug">
              <span
                className={cn(
                  isToday ? "text-[#E65141]" : "text-muted-foreground"
                )}
              >
                {prefix} {suffix}
              </span>
            </div>

            {/* Right column: Event Details with left green pipe */}
            <div className="flex-1 border-l-[3px] border-[#5EBC86] p-4 flex flex-col gap-1.5 transition-colors hover:bg-[hsl(var(--cp-hover))]">
              <Link href={`/meetings/${m.id}`} className="flex flex-col gap-1.5">
                <h4 className="text-[14px] font-semibold text-foreground leading-snug">
                  {m.title}
                </h4>

                {/* Example of optional attachment link - shown if agenda items exist to mimic the screenshot's g.co/calendar link styling */}
                {m.agendaItemCount > 0 && (
                  <div className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors">
                    <Paperclip className="h-3 w-3" />
                    <span>{m.agendaItemCount} agenda item{m.agendaItemCount === 1 ? "" : "s"}</span>
                  </div>
                )}

                <div className="text-[12px] text-muted-foreground mt-0.5">
                  {startTime} · Beespo Workspace
                </div>
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
