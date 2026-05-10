"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { Settings, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  AudienceProgram,
  type AudienceAnnouncement,
  type AudienceMeeting,
} from "@/components/audience/audience-program"
import {
  loadAudienceAnnouncements,
  type AudienceAnnouncementSelection,
} from "@/lib/audience/announcements"
import { createClient } from "@/lib/supabase/client"

type AudienceViewProps = {
  unitName: string
  isoDate: string
  meeting: AudienceMeeting
  workspaceId?: string | null
  announcementSelection?: AudienceAnnouncementSelection[]
  onCloseAction: () => void
  onTopicUpdateAction: (
    entryId: string,
    patch: { topic?: string; topicUrl?: string | null },
  ) => void
}

export function SacramentMeetingAudienceView({
  unitName,
  isoDate,
  meeting,
  workspaceId,
  announcementSelection,
  onCloseAction,
}: AudienceViewProps) {
  const [mounted, setMounted] = useState(false)
  const [announcements, setAnnouncements] = useState<AudienceAnnouncement[]>([])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    let cancelled = false
    if (!workspaceId || !announcementSelection || announcementSelection.length === 0) {
      setAnnouncements([])
      return
    }
    const supabase = createClient()
    void loadAudienceAnnouncements(supabase, workspaceId, announcementSelection).then((rows) => {
      if (!cancelled) setAnnouncements(rows)
    })
    return () => {
      cancelled = true
    }
  }, [workspaceId, announcementSelection])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        onCloseAction()
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [onCloseAction])

  if (!mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-card">
      <div className="sticky top-0 z-10 flex h-14 items-center justify-between gap-2 bg-card/90 px-4 backdrop-blur">
        <Link
          href="/settings/audience"
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <Settings className="h-3.5 w-3.5" />
          Manage public link
        </Link>
        <Button type="button" variant="outline" className="rounded-full" onClick={onCloseAction}>
          <X className="h-3.5 w-3.5" />
          Close
          <kbd className="ml-1 hidden rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">
            Esc
          </kbd>
        </Button>
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-col items-center px-4 py-10 sm:px-6 lg:px-8">
        <AudienceProgram
          unitName={unitName}
          isoDate={isoDate}
          meeting={meeting}
          announcements={announcements}
          language={meeting.contentLanguage}
          className="rounded-[2px] border border-border bg-background shadow-lg"
        />
      </div>
    </div>,
    document.body,
  )
}
