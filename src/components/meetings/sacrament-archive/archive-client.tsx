"use client"

import type { ReactNode } from "react"
import { useState } from "react"
import { format, formatDistanceToNow } from "date-fns"
import {
  BookOpenText,
  Briefcase,
  CalendarDays,
  ChevronRight,
  Clock3,
  Landmark,
  Megaphone,
  Music4,
  Search,
  StickyNote,
  UserRound,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import type { ArchiveMeetingSummary } from "@/lib/sacrament-archive"

type ArchiveScope = "all" | "standard" | "fast" | "conference"

const SCOPES: Array<{ key: ArchiveScope; label: string }> = [
  { key: "all", label: "All" },
  { key: "standard", label: "Standard" },
  { key: "fast", label: "Fast & Testimony" },
  { key: "conference", label: "Conference" },
]

function getScopeKey(item: ArchiveMeetingSummary): ArchiveScope {
  if (item.specialType === "fast-testimony") return "fast"
  if (
    item.specialType === "general-conference" ||
    item.specialType === "stake-conference" ||
    item.specialType === "ward-conference"
  ) {
    return "conference"
  }
  return "standard"
}

function formatMeetingDate(isoDate: string) {
  return format(new Date(`${isoDate}T12:00:00`), "EEEE, MMMM d, yyyy")
}

function relativeUpdatedAt(updatedAt: string | null) {
  if (!updatedAt) return null
  return formatDistanceToNow(new Date(updatedAt), { addSuffix: true })
}

function countAssigned(items: Array<{ name: string | null }>) {
  return items.filter((item) => Boolean(item.name)).length
}

function detailCountLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`
}

function meetingMatches(item: ArchiveMeetingSummary, scope: ArchiveScope, search: string) {
  if (scope !== "all" && getScopeKey(item) !== scope) return false
  const query = search.trim().toLowerCase()
  if (!query) return true
  return item.searchText.includes(query)
}

function detailItems(
  items: Array<{ id: string; title: string; detail?: string | null; checked: boolean }>
) {
  return items.filter((item) => item.checked)
}

export function ArchiveClient({ meetings }: { meetings: ArchiveMeetingSummary[] }) {
  const [scope, setScope] = useState<ArchiveScope>("all")
  const [search, setSearch] = useState("")
  const [selectedMeeting, setSelectedMeeting] = useState<ArchiveMeetingSummary | null>(null)

  const counts = {
    all: meetings.length,
    standard: meetings.filter((item) => getScopeKey(item) === "standard").length,
    fast: meetings.filter((item) => getScopeKey(item) === "fast").length,
    conference: meetings.filter((item) => getScopeKey(item) === "conference").length,
  }

  const filteredMeetings = meetings.filter((item) => meetingMatches(item, scope, search))

  return (
    <>
      <div className="min-h-full bg-surface-canvas px-5 py-10 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[1100px]">
          <div className="flex items-start justify-between gap-6">
            <div className="space-y-3">
              <div className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground/70">
                Sacrament meeting
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                  Archive
                </h1>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  Review past sacrament meetings at a glance and search across speakers,
                  hymns, announcements, business, and notes.
                </p>
              </div>
            </div>
            <div className="hidden rounded-[12px] border border-border/70 bg-background/80 px-4 py-3 text-right shadow-sm sm:block">
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/70">
                Archived Sundays
              </div>
              <div className="mt-1 text-2xl font-semibold leading-none">{counts.all}</div>
            </div>
          </div>

          <div className="mt-10 flex gap-8 border-b border-border/70 pb-3">
            {SCOPES.map((item) => {
              const active = item.key === scope
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setScope(item.key)}
                  className={cn(
                    "inline-flex items-center gap-2 border-b-2 pb-2 text-sm font-medium transition-colors",
                    active
                      ? "border-foreground text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  {item.label}
                  <span className="text-xs text-muted-foreground">{counts[item.key]}</span>
                </button>
              )
            })}
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search speakers, hymns, announcements, business, or notes"
                className="h-10 rounded-[10px] border-border/70 bg-background pl-9"
              />
            </div>
            <Badge variant="secondary" className="justify-center rounded-full px-3 py-1">
              {detailCountLabel(filteredMeetings.length, "result")}
            </Badge>
          </div>

          <div className="mt-8 space-y-3">
            {filteredMeetings.length === 0 ? (
              <div className="rounded-[12px] border border-dashed border-border/80 bg-background/80 px-6 py-12 text-center">
                <BookOpenText className="mx-auto h-8 w-8 text-muted-foreground/70" />
                <h2 className="mt-4 text-lg font-semibold">No archived meetings match</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Try a different search or switch scopes.
                </p>
              </div>
            ) : (
              filteredMeetings.map((meeting) => {
                const checkedAnnouncements = detailItems(meeting.announcements)
                const checkedBusiness = detailItems(meeting.business)
                const assignedSpeakers = countAssigned(meeting.speakers)
                const assignedPrayers = countAssigned(meeting.prayers)

                return (
                  <button
                    key={meeting.id}
                    type="button"
                    onClick={() => setSelectedMeeting(meeting)}
                    className="w-full rounded-[12px] border border-border/70 bg-background p-5 text-left transition-colors hover:border-primary/35 hover:bg-accent/20"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5">
                            <CalendarDays className="h-3.5 w-3.5" />
                            {formatMeetingDate(meeting.meetingDate)}
                          </span>
                          <Badge variant="outline" className="rounded-full px-2 py-0.5 font-medium">
                            {meeting.meetingTypeLabel}
                          </Badge>
                        </div>

                        <div className="space-y-1">
                          <h2 className="text-xl font-semibold tracking-tight">{meeting.title}</h2>
                          <p className="text-sm text-muted-foreground">
                            {meeting.conducting
                              ? `Conducted by ${meeting.conducting}`
                              : "Conducting not recorded"}
                            {meeting.presiding ? ` • Presiding: ${meeting.presiding}` : ""}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <ArchiveMetaPill icon={UserRound}>
                            {assignedSpeakers > 0
                              ? `${detailCountLabel(assignedSpeakers, "speaker")} assigned`
                              : "No speakers recorded"}
                          </ArchiveMetaPill>
                          <ArchiveMetaPill icon={Music4}>
                            {[meeting.openingHymn, meeting.sacramentHymn, meeting.closingHymn]
                              .filter(Boolean)
                              .length || 0}{" "}
                            hymns chosen
                          </ArchiveMetaPill>
                          <ArchiveMetaPill icon={Megaphone}>
                            {detailCountLabel(checkedAnnouncements.length, "announcement")}
                          </ArchiveMetaPill>
                          <ArchiveMetaPill icon={Briefcase}>
                            {detailCountLabel(checkedBusiness.length, "business item")}
                          </ArchiveMetaPill>
                          <ArchiveMetaPill icon={StickyNote}>
                            {meeting.notes ? "Notes captured" : "No notes"}
                          </ArchiveMetaPill>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <div className="text-right">
                          <div className="inline-flex items-center gap-1">
                            <Clock3 className="h-3.5 w-3.5" />
                            {meeting.meetingTime}
                          </div>
                          {meeting.updatedAt ? (
                            <div className="mt-1 text-xs">
                              Updated {relativeUpdatedAt(meeting.updatedAt)}
                            </div>
                          ) : null}
                          {assignedPrayers > 0 ? (
                            <div className="mt-1 text-xs">
                              {detailCountLabel(assignedPrayers, "prayer")} assigned
                            </div>
                          ) : null}
                        </div>
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      </div>

      <Dialog open={Boolean(selectedMeeting)} onOpenChange={(open) => !open && setSelectedMeeting(null)}>
        <DialogContent className="max-h-[85vh] max-w-4xl overflow-hidden p-0">
          {selectedMeeting ? (
            <>
              <DialogHeader className="border-b border-border/70 px-6 py-5">
                <DialogTitle className="text-2xl tracking-tight">
                  {selectedMeeting.title}
                </DialogTitle>
                <DialogDescription className="flex flex-wrap items-center gap-2 pt-1 text-sm">
                  <span>{formatMeetingDate(selectedMeeting.meetingDate)}</span>
                  <span>•</span>
                  <span>{selectedMeeting.meetingTypeLabel}</span>
                  <span>•</span>
                  <span>{selectedMeeting.meetingTime}</span>
                </DialogDescription>
              </DialogHeader>

              <ScrollArea className="max-h-[calc(85vh-92px)]">
                <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1.3fr_0.9fr]">
                  <div className="space-y-6">
                    <ArchiveSection title="Program">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <ArchiveFact label="Presiding" value={selectedMeeting.presiding} />
                        <ArchiveFact label="Conducting" value={selectedMeeting.conducting} />
                        <ArchiveFact label="Opening Hymn" value={selectedMeeting.openingHymn} />
                        <ArchiveFact label="Sacrament Hymn" value={selectedMeeting.sacramentHymn} />
                        <ArchiveFact label="Closing Hymn" value={selectedMeeting.closingHymn} />
                      </div>
                    </ArchiveSection>

                    <ArchiveSection title="Speakers">
                      {selectedMeeting.speakers.length === 0 ? (
                        <ArchiveEmptyLine>No speakers captured.</ArchiveEmptyLine>
                      ) : (
                        <div className="space-y-3">
                          {selectedMeeting.speakers.map((speaker, index) => (
                            <div key={speaker.id} className="rounded-[10px] border border-border/70 px-4 py-3">
                              <div className="text-sm font-medium">
                                {speaker.name || `Speaker ${index + 1}`}
                              </div>
                              <div className="mt-1 text-sm text-muted-foreground">
                                {speaker.topic || "No topic recorded"}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ArchiveSection>

                    <ArchiveSection title="Announcements">
                      <ArchiveChecklist items={detailItems(selectedMeeting.announcements)} emptyLabel="No announcements checked for this meeting." />
                    </ArchiveSection>

                    <ArchiveSection title="Business">
                      <ArchiveChecklist items={detailItems(selectedMeeting.business)} emptyLabel="No business items checked for this meeting." />
                    </ArchiveSection>

                    <ArchiveSection title="Notes">
                      {selectedMeeting.notes ? (
                        <div className="rounded-[10px] border border-border/70 bg-muted/20 px-4 py-3 text-sm leading-6 whitespace-pre-wrap">
                          {selectedMeeting.notes}
                        </div>
                      ) : (
                        <ArchiveEmptyLine>No freeform notes were captured.</ArchiveEmptyLine>
                      )}
                    </ArchiveSection>
                  </div>

                  <div className="space-y-6">
                    <ArchiveSection title="Assignments">
                      {selectedMeeting.prayers.length === 0 ? (
                        <ArchiveEmptyLine>No prayer assignments captured.</ArchiveEmptyLine>
                      ) : (
                        <div className="space-y-3">
                          {selectedMeeting.prayers.map((prayer) => (
                            <ArchiveFact key={prayer.id} label={prayer.role} value={prayer.name} />
                          ))}
                        </div>
                      )}
                    </ArchiveSection>

                    <ArchiveSection title="Archive Summary">
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center justify-between gap-4">
                          <span>Speakers assigned</span>
                          <span className="font-medium text-foreground">
                            {countAssigned(selectedMeeting.speakers)} / {selectedMeeting.speakers.length}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span>Prayers assigned</span>
                          <span className="font-medium text-foreground">
                            {countAssigned(selectedMeeting.prayers)} / {selectedMeeting.prayers.length}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span>Announcements included</span>
                          <span className="font-medium text-foreground">
                            {detailItems(selectedMeeting.announcements).length}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span>Business items included</span>
                          <span className="font-medium text-foreground">
                            {detailItems(selectedMeeting.business).length}
                          </span>
                        </div>
                        {selectedMeeting.updatedAt ? (
                          <div className="flex items-center justify-between gap-4 border-t border-border/70 pt-2">
                            <span>Last updated</span>
                            <span className="font-medium text-foreground">
                              {relativeUpdatedAt(selectedMeeting.updatedAt)}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </ArchiveSection>

                    <div className="rounded-[12px] border border-border/70 bg-muted/25 p-4">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Landmark className="h-4 w-4 text-primary" />
                        Why this layout
                      </div>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        The archive uses the same pattern as announcements: scope first,
                        search second, scan-friendly cards in the middle, and details on demand.
                        That keeps the page fast to scan while still making historical content searchable.
                      </p>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}

function ArchiveMetaPill({
  icon: Icon,
  children,
}: {
  icon: typeof UserRound
  children: ReactNode
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/20 px-3 py-1">
      <Icon className="h-3.5 w-3.5" />
      <span>{children}</span>
    </span>
  )
}

function ArchiveSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground/80">
        {title}
      </h3>
      {children}
    </section>
  )
}

function ArchiveFact({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-[10px] border border-border/70 px-4 py-3">
      <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground/75">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium text-foreground">
        {value || "Not recorded"}
      </div>
    </div>
  )
}

function ArchiveChecklist({
  items,
  emptyLabel,
}: {
  items: Array<{ id: string; title: string; detail?: string | null }>
  emptyLabel: string
}) {
  if (items.length === 0) {
    return <ArchiveEmptyLine>{emptyLabel}</ArchiveEmptyLine>
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="rounded-[10px] border border-border/70 px-4 py-3">
          <div className="text-sm font-medium">{item.title}</div>
          {item.detail ? (
            <div className="mt-1 text-sm text-muted-foreground">{item.detail}</div>
          ) : null}
        </div>
      ))}
    </div>
  )
}

function ArchiveEmptyLine({ children }: { children: ReactNode }) {
  return <div className="text-sm text-muted-foreground">{children}</div>
}
