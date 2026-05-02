"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { Calendar } from "lucide-react"
import { cn } from "@/lib/utils"
import type { BusinessItem } from "@/components/business/business-table"
import { readPlannerDraftMeta, getDefaultMeetingTitle } from "@/lib/sundays"
import type { MeetingSpecialType } from "@/lib/sundays"
import { isBusinessCategoryKey, BUSINESS_CATEGORY_LABEL } from "@/lib/business/combined-script"

interface BusinessMeetingAssignmentCardProps {
  meetingDate: string
  items: BusinessItem[]
  onOpenItem?: (item: BusinessItem) => void
}

function itemSubtitle(item: BusinessItem): string {
  if (isBusinessCategoryKey(item.category)) {
    return item.position_calling?.trim() || BUSINESS_CATEGORY_LABEL[item.category]
  }
  return item.position_calling?.trim() || item.category
}

export function BusinessMeetingAssignmentCard({
  meetingDate,
  items,
  onOpenItem,
}: BusinessMeetingAssignmentCardProps) {
  const [metaTitle, setMetaTitle] = useState<string | null>(null)
  const [metaSpecialType, setMetaSpecialType] = useState<MeetingSpecialType | null>(null)

  useEffect(() => {
    const draftMeta = readPlannerDraftMeta()
    const meta = draftMeta[meetingDate]
    setMetaTitle(meta?.title?.trim() || null)
    setMetaSpecialType(meta?.specialType || null)
  }, [meetingDate])

  const meetingTitle = metaTitle || getDefaultMeetingTitle(metaSpecialType ?? "standard")
  const dateLabel = format(new Date(`${meetingDate}T12:00:00`), "EEEE, MMMM d, yyyy")

  return (
    <div className="rounded-2xl border border-border/70 bg-surface-raised overflow-hidden shadow-sm">
      {/* Card header */}
      <div className="border-b border-border/70 px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              Assigned Meeting
            </div>
            <h3 className="mt-2 font-serif text-[22px] leading-tight text-foreground">
              {meetingTitle}
            </h3>
            <div className="mt-1.5 text-[12.5px] text-muted-foreground">{dateLabel}</div>
          </div>
          <span className="shrink-0 rounded-full border border-border/60 bg-surface-sunken px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            {items.length} item{items.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {/* Items list */}
      <div className="px-5 py-4">
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              onClick={() => onOpenItem?.(item)}
              className={cn(
                "flex items-center gap-3 rounded-lg border border-border/60 bg-background px-3.5 py-2.5",
                onOpenItem && "cursor-pointer transition-colors hover:border-border hover:bg-surface-hover"
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-medium text-foreground">
                  {item.person_name}
                </div>
                <div className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
                  {itemSubtitle(item)}
                </div>
              </div>
              <span className="shrink-0 rounded-full border border-border/60 bg-surface-sunken px-2 py-1 text-[10px] font-medium capitalize text-muted-foreground">
                {item.category}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
