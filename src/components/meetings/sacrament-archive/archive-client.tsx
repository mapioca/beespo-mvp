"use client"

import type { ReactNode } from "react"
import { useMemo, useState } from "react"
import { format, formatDistanceToNow } from "date-fns"
import {
  BookOpenText,
  Briefcase,
  CalendarDays,
  ChevronRight,
  Clock3,
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
import { isRichTextEmpty, sanitizeRichTextHtml } from "@/lib/rich-text"
import type { ArchiveMeetingSummary } from "@/lib/sacrament-archive"
import { AssignmentStatusPill } from "@/components/meetings/sacrament-meeting/assignment-status-pill"
import type { AssignmentStatus } from "@/lib/sacrament-confirmations"

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

type ArchiveView = "meetings" | "timeline" | "people"

type PeopleRole = "speaker" | "prayer"

type TimelineRole = "all" | "speaker" | "prayer"

const TIMELINE_ROLES: Array<{ key: TimelineRole; label: string }> = [
  { key: "all", label: "All assignments" },
  { key: "speaker", label: "Speakers" },
  { key: "prayer", label: "Prayers" },
]

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
]

type PersonAssignment = {
  id: string
  meetingDate: string
  meetingTitle: string
  roleLabel: string
  status: AssignmentStatus | null
  declineNote: string | null
  topic: string | null
}

type ArchivePerson = {
  key: string
  name: string
  total: number
  lastDate: string
  assignments: PersonAssignment[]
}

// Walk the loaded archive and roll up per-person history. The ArchiveMeetingSummary
// shape already carries everything we need, so this is a pure client-side derivation.
function aggregatePeople(
  meetings: ArchiveMeetingSummary[],
  role: PeopleRole
): ArchivePerson[] {
  const map = new Map<string, ArchivePerson>()

  const upsert = (
    name: string,
    meeting: ArchiveMeetingSummary,
    assignment: PersonAssignment
  ) => {
    const trimmed = name.trim()
    if (!trimmed) return
    const key = trimmed.toLowerCase()
    const existing = map.get(key)
    if (existing) {
      existing.total += 1
      existing.assignments.push(assignment)
      // Use the most recent variant of the name as the canonical display.
      if (meeting.meetingDate > existing.lastDate) {
        existing.lastDate = meeting.meetingDate
        existing.name = trimmed
      }
    } else {
      map.set(key, {
        key,
        name: trimmed,
        total: 1,
        lastDate: meeting.meetingDate,
        assignments: [assignment],
      })
    }
  }

  for (const meeting of meetings) {
    if (role === "speaker") {
      for (const speaker of meeting.speakers) {
        if (!speaker.name) continue
        upsert(speaker.name, meeting, {
          id: `${meeting.meetingDate}-${speaker.id}`,
          meetingDate: meeting.meetingDate,
          meetingTitle: meeting.title,
          roleLabel: "Speaker",
          status: speaker.status,
          declineNote: speaker.declineNote,
          topic: speaker.topic,
        })
      }
    } else {
      for (const prayer of meeting.prayers) {
        if (!prayer.name) continue
        upsert(prayer.name, meeting, {
          id: `${meeting.meetingDate}-${prayer.id}`,
          meetingDate: meeting.meetingDate,
          meetingTitle: meeting.title,
          roleLabel: prayer.role,
          status: prayer.status,
          declineNote: prayer.declineNote,
          topic: null,
        })
      }
    }
  }

  return Array.from(map.values())
    .map((person) => ({
      ...person,
      assignments: [...person.assignments].sort((a, b) =>
        b.meetingDate.localeCompare(a.meetingDate)
      ),
    }))
    .sort((a, b) => b.lastDate.localeCompare(a.lastDate))
}

function relativeFromIsoDate(isoDate: string): string {
  try {
    return formatDistanceToNow(new Date(`${isoDate}T12:00:00`), { addSuffix: true })
  } catch {
    return isoDate
  }
}

function shortDate(isoDate: string): string {
  try {
    return format(new Date(`${isoDate}T12:00:00`), "MMM d, yyyy")
  } catch {
    return isoDate
  }
}

function getMeetingDate(isoDate: string): Date {
  return new Date(`${isoDate}T12:00:00`)
}

function getTimelineCount(meetings: ArchiveMeetingSummary[], role: TimelineRole): number {
  return meetings.reduce((total, meeting) => {
    const speakerCount =
      role === "all" || role === "speaker" ? countAssigned(meeting.speakers) : 0
    const prayerCount =
      role === "all" || role === "prayer" ? countAssigned(meeting.prayers) : 0
    return total + speakerCount + prayerCount
  }, 0)
}

function groupMeetingsByYear(meetings: ArchiveMeetingSummary[]) {
  const byYear = new Map<number, ArchiveMeetingSummary[]>()

  for (const meeting of meetings) {
    const year = getMeetingDate(meeting.meetingDate).getFullYear()
    const yearMeetings = byYear.get(year) ?? []
    yearMeetings.push(meeting)
    byYear.set(year, yearMeetings)
  }

  return Array.from(byYear.entries())
    .sort(([yearA], [yearB]) => yearB - yearA)
    .map(([year, yearMeetings]) => ({
      year,
      months: MONTH_LABELS.map((label, monthIndex) => ({
        label,
        monthIndex,
        meetings: yearMeetings
          .filter((meeting) => getMeetingDate(meeting.meetingDate).getMonth() === monthIndex)
          .sort((a, b) => a.meetingDate.localeCompare(b.meetingDate)),
      })),
    }))
}

function sundayOrdinal(isoDate: string): string {
  const day = getMeetingDate(isoDate).getDate()
  const ordinal = Math.floor((day - 1) / 7) + 1
  return ["1st", "2nd", "3rd", "4th", "5th"][ordinal - 1] ?? `${ordinal}th`
}

export function ArchiveClient({ meetings }: { meetings: ArchiveMeetingSummary[] }) {
  const [view, setView] = useState<ArchiveView>("meetings")
  const [scope, setScope] = useState<ArchiveScope>("all")
  const [peopleRole, setPeopleRole] = useState<PeopleRole>("speaker")
  const [timelineRole, setTimelineRole] = useState<TimelineRole>("all")
  const [search, setSearch] = useState("")
  const [selectedMeeting, setSelectedMeeting] = useState<ArchiveMeetingSummary | null>(null)
  const [expandedPersonKey, setExpandedPersonKey] = useState<string | null>(null)

  const counts = {
    all: meetings.length,
    standard: meetings.filter((item) => getScopeKey(item) === "standard").length,
    fast: meetings.filter((item) => getScopeKey(item) === "fast").length,
    conference: meetings.filter((item) => getScopeKey(item) === "conference").length,
  }

  const speakerPeople = useMemo(() => aggregatePeople(meetings, "speaker"), [meetings])
  const prayerPeople = useMemo(() => aggregatePeople(meetings, "prayer"), [meetings])

  const peopleSource = peopleRole === "speaker" ? speakerPeople : prayerPeople
  const peopleQuery = search.trim().toLowerCase()
  const filteredPeople = peopleQuery
    ? peopleSource.filter((person) => person.name.toLowerCase().includes(peopleQuery))
    : peopleSource

  const totalUniquePeople = useMemo(() => {
    const seen = new Set<string>()
    for (const p of speakerPeople) seen.add(p.key)
    for (const p of prayerPeople) seen.add(p.key)
    return seen.size
  }, [speakerPeople, prayerPeople])

  const filteredMeetings = meetings.filter((item) => meetingMatches(item, scope, search))
  const timelineAssignmentCount = getTimelineCount(filteredMeetings, timelineRole)
  const visibleResultCount =
    view === "people" ? filteredPeople.length : filteredMeetings.length

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

          {/* Top-level view: meetings, timeline, people */}
          <div className="mt-10 flex gap-8 border-b border-border/70 pb-3">
            {(
              [
                { key: "meetings" as const, label: "Meetings", count: counts.all },
                { key: "timeline" as const, label: "Timeline", count: counts.all },
                { key: "people" as const, label: "People", count: totalUniquePeople },
              ]
            ).map((tab) => {
              const active = tab.key === view
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setView(tab.key)}
                  className={cn(
                    "inline-flex items-center gap-2 border-b-2 pb-2 text-sm font-medium transition-colors",
                    active
                      ? "border-foreground text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab.label}
                  <span className="text-xs text-muted-foreground">{tab.count}</span>
                </button>
              )
            })}
          </div>

          {/* Sub-tabs for the active view */}
          {view === "meetings" || view === "timeline" ? (
            <div className="mt-4 space-y-3 border-b border-border/40 pb-3">
              <div className="flex flex-wrap gap-6">
                {SCOPES.map((item) => {
                  const active = item.key === scope
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setScope(item.key)}
                      className={cn(
                        "inline-flex items-center gap-1.5 border-b-2 pb-1.5 text-[13px] font-medium transition-colors",
                        active
                          ? "border-foreground/70 text-foreground"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {item.label}
                      <span className="text-[11px] text-muted-foreground">
                        {counts[item.key]}
                      </span>
                    </button>
                  )
                })}
              </div>
              {view === "timeline" ? (
                <div className="flex flex-wrap gap-2">
                  {TIMELINE_ROLES.map((item) => {
                    const active = item.key === timelineRole
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setTimelineRole(item.key)}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                          active
                            ? "border-foreground bg-foreground text-background"
                            : "border-border/70 bg-background text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {item.label}
                      </button>
                    )
                  })}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-4 flex gap-6 border-b border-border/40 pb-3">
              {(
                [
                  { key: "speaker" as const, label: "Speakers", count: speakerPeople.length },
                  { key: "prayer" as const, label: "Prayer-givers", count: prayerPeople.length },
                ]
              ).map((tab) => {
                const active = tab.key === peopleRole
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => {
                      setPeopleRole(tab.key)
                      setExpandedPersonKey(null)
                    }}
                    className={cn(
                      "inline-flex items-center gap-1.5 border-b-2 pb-1.5 text-[13px] font-medium transition-colors",
                      active
                        ? "border-foreground/70 text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {tab.label}
                    <span className="text-[11px] text-muted-foreground">{tab.count}</span>
                  </button>
                )
              })}
            </div>
          )}

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={
                  view === "people"
                    ? "Search by name"
                    : view === "timeline"
                      ? "Search names, topics, hymns, or notes"
                      : "Search speakers, hymns, announcements, business, or notes"
                }
                className="h-10 rounded-[10px] border-border/70 bg-background pl-9"
              />
            </div>
            <Badge variant="secondary" className="justify-center rounded-full px-3 py-1">
              {view === "people"
                ? detailCountLabel(visibleResultCount, "person", "people")
                : view === "timeline"
                  ? `${detailCountLabel(visibleResultCount, "meeting")} / ${detailCountLabel(
                      timelineAssignmentCount,
                      "assignment"
                    )}`
                  : detailCountLabel(visibleResultCount, "result")}
            </Badge>
          </div>

          {view === "meetings" && (
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
                            {isRichTextEmpty(meeting.notes) ? "No notes" : "Notes captured"}
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
          )}

          {view === "timeline" && (
            <ArchiveTimelineMatrix
              meetings={filteredMeetings}
              role={timelineRole}
              onSelectMeeting={setSelectedMeeting}
              hasResults={meetings.length > 0}
            />
          )}

          {view === "people" && (
            <PeopleList
              people={filteredPeople}
              role={peopleRole}
              expandedKey={expandedPersonKey}
              onToggleExpand={(key) =>
                setExpandedPersonKey((current) => (current === key ? null : key))
              }
              hasResults={peopleSource.length > 0}
            />
          )}
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
                              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                                <span
                                  className={cn(
                                    "text-sm font-medium",
                                    speaker.status === "declined" &&
                                      "text-muted-foreground line-through decoration-muted-foreground/50"
                                  )}
                                >
                                  {speaker.name || `Speaker ${index + 1}`}
                                </span>
                                {speaker.name && speaker.status ? (
                                  <AssignmentStatusPill
                                    status={speaker.status}
                                    declineNote={speaker.declineNote}
                                    onChange={() => {}}
                                    interactive={false}
                                  />
                                ) : null}
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
                      {isRichTextEmpty(selectedMeeting.notes) ? (
                        <ArchiveEmptyLine>No freeform notes were captured.</ArchiveEmptyLine>
                      ) : (
                        <div
                          className="prose prose-sm max-w-none rounded-[10px] border border-border/70 bg-muted/20 px-4 py-3 text-sm leading-6 dark:prose-invert [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-5"
                          dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(selectedMeeting.notes) }}
                        />
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
                            <div
                              key={prayer.id}
                              className="rounded-[10px] border border-border/70 px-4 py-3"
                            >
                              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground/75">
                                {prayer.role}
                              </div>
                              <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                                <span
                                  className={cn(
                                    "text-sm font-medium",
                                    prayer.name && prayer.status === "declined"
                                      ? "text-muted-foreground line-through decoration-muted-foreground/50"
                                      : "text-foreground"
                                  )}
                                >
                                  {prayer.name || "Not recorded"}
                                </span>
                                {prayer.name && prayer.status ? (
                                  <AssignmentStatusPill
                                    status={prayer.status}
                                    declineNote={prayer.declineNote}
                                    onChange={() => {}}
                                    interactive={false}
                                  />
                                ) : null}
                              </div>
                            </div>
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

function ArchiveTimelineMatrix({
  meetings,
  role,
  onSelectMeeting,
  hasResults,
}: {
  meetings: ArchiveMeetingSummary[]
  role: TimelineRole
  onSelectMeeting: (meeting: ArchiveMeetingSummary) => void
  hasResults: boolean
}) {
  const yearGroups = useMemo(() => groupMeetingsByYear(meetings), [meetings])

  if (meetings.length === 0) {
    return (
      <div className="mt-8 rounded-[12px] border border-dashed border-border/80 bg-background/80 px-6 py-12 text-center">
        <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground/70" />
        <h2 className="mt-4 text-lg font-semibold">
          {hasResults ? "No archived meetings match" : "No archived meetings yet"}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {hasResults
            ? "Try a different search or switch scopes."
            : "Past meetings will appear here once they are archived."}
        </p>
      </div>
    )
  }

  return (
    <div className="mt-8 rounded-[12px] border border-border/70 bg-background p-4 shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border/60 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Year matrix</h2>
          <div className="mt-1 text-sm text-muted-foreground">
            {detailCountLabel(meetings.length, "archived Sunday")}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] font-medium">
          {(role === "all" || role === "speaker") && (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100">
              Speakers
            </span>
          )}
          {(role === "all" || role === "prayer") && (
            <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-100">
              Prayers
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 overflow-x-auto pb-2">
        <div className="min-w-[1560px] space-y-7">
          {yearGroups.map((group) => (
            <section key={group.year}>
              <div className="mb-3 flex items-center justify-between gap-4">
                <h3 className="text-xl font-semibold tabular-nums tracking-tight">
                  {group.year}
                </h3>
                <div className="text-xs text-muted-foreground">
                  {detailCountLabel(
                    group.months.reduce((total, month) => total + month.meetings.length, 0),
                    "Sunday"
                  )}
                </div>
              </div>

              <div className="grid grid-cols-12 gap-2">
                {group.months.map((month) => (
                  <div
                    key={`${group.year}-${month.monthIndex}`}
                    className="min-h-[230px] rounded-[10px] border border-border/70 bg-muted/10"
                  >
                    <div className="flex items-center justify-between border-b border-border/60 px-2.5 py-2">
                      <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-foreground">
                        {month.label}
                      </span>
                      <span className="text-[11px] tabular-nums text-muted-foreground">
                        {month.meetings.length || ""}
                      </span>
                    </div>

                    <div className="space-y-2 p-2">
                      {month.meetings.length > 0 ? (
                        month.meetings.map((meeting) => (
                          <TimelineMeetingCell
                            key={meeting.id}
                            meeting={meeting}
                            role={role}
                            onSelect={() => onSelectMeeting(meeting)}
                          />
                        ))
                      ) : (
                        <div className="flex h-[166px] items-center justify-center rounded-[8px] border border-dashed border-border/60 px-2 text-center text-[11px] text-muted-foreground/70">
                          Empty
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}

function TimelineMeetingCell({
  meeting,
  role,
  onSelect,
}: {
  meeting: ArchiveMeetingSummary
  role: TimelineRole
  onSelect: () => void
}) {
  const showSpeakers = role === "all" || role === "speaker"
  const showPrayers = role === "all" || role === "prayer"
  const speakers = meeting.speakers.filter((speaker) => speaker.name)
  const prayers = meeting.prayers.filter((prayer) => prayer.name)
  const hasVisibleAssignments =
    (showSpeakers && speakers.length > 0) || (showPrayers && prayers.length > 0)

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`Open ${formatMeetingDate(meeting.meetingDate)}`}
      title={`${formatMeetingDate(meeting.meetingDate)} - ${meeting.title}`}
      className="w-full rounded-[8px] border border-border/70 bg-background px-2 py-2 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-accent/20"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold tabular-nums text-foreground">
          {format(getMeetingDate(meeting.meetingDate), "d")}
        </span>
        <span className="truncate text-[10.5px] text-muted-foreground">
          {sundayOrdinal(meeting.meetingDate)}
        </span>
      </div>

      <div className="mt-2 space-y-1.5">
        {showSpeakers
          ? speakers.map((speaker, index) => (
              <TimelineNameChip
                key={speaker.id}
                label={index === 0 ? "Spk" : `Spk ${index + 1}`}
                name={speaker.name ?? ""}
                tone="speaker"
                muted={speaker.status === "declined"}
              />
            ))
          : null}

        {showPrayers
          ? prayers.map((prayer) => (
              <TimelineNameChip
                key={prayer.id}
                label={prayer.role === "Invocation" ? "Inv" : "Ben"}
                name={prayer.name ?? ""}
                tone="prayer"
                muted={prayer.status === "declined"}
              />
            ))
          : null}

        {!hasVisibleAssignments ? (
          <div className="rounded-[6px] border border-dashed border-border/60 px-2 py-1.5 text-[11px] text-muted-foreground">
            No names
          </div>
        ) : null}
      </div>
    </button>
  )
}

function TimelineNameChip({
  label,
  name,
  tone,
  muted,
}: {
  label: string
  name: string
  tone: "speaker" | "prayer"
  muted: boolean
}) {
  return (
    <span
      className={cn(
        "block min-w-0 rounded-[6px] border px-2 py-1 text-[11px] leading-tight",
        tone === "speaker"
          ? "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100"
          : "border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-100",
        muted && "opacity-60 line-through decoration-current/70"
      )}
    >
      <span className="mr-1 font-semibold uppercase tracking-[0.06em]">{label}</span>
      <span className="align-baseline [overflow-wrap:anywhere]">{name}</span>
    </span>
  )
}

function PeopleList({
  people,
  role,
  expandedKey,
  onToggleExpand,
  hasResults,
}: {
  people: ArchivePerson[]
  role: PeopleRole
  expandedKey: string | null
  onToggleExpand: (key: string) => void
  hasResults: boolean
}) {
  if (people.length === 0) {
    const emptyTitle = hasResults
      ? "No people match"
      : role === "speaker"
        ? "No speakers in the archive yet"
        : "No prayer assignments in the archive yet"
    const emptyHelp = hasResults
      ? "Try a different search."
      : "As past meetings accumulate, contributors will show up here."
    return (
      <div className="mt-8 rounded-[12px] border border-dashed border-border/80 bg-background/80 px-6 py-12 text-center">
        <UserRound className="mx-auto h-8 w-8 text-muted-foreground/70" />
        <h2 className="mt-4 text-lg font-semibold">{emptyTitle}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{emptyHelp}</p>
      </div>
    )
  }

  return (
    <div className="mt-8 overflow-hidden rounded-[12px] border border-border/70 bg-background">
      <ul className="divide-y divide-border/60">
        {people.map((person) => (
          <PersonRow
            key={person.key}
            person={person}
            expanded={expandedKey === person.key}
            onToggle={() => onToggleExpand(person.key)}
          />
        ))}
      </ul>
    </div>
  )
}

function PersonRow({
  person,
  expanded,
  onToggle,
}: {
  person: ArchivePerson
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className={cn(
          "flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-accent/30 sm:px-5",
          expanded && "bg-accent/20"
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14.5px] font-medium text-foreground">{person.name}</div>
          <div className="mt-0.5 text-[12px] text-muted-foreground">
            Last assigned {relativeFromIsoDate(person.lastDate)}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="text-right">
            <div className="text-[14px] font-semibold tabular-nums text-foreground">
              {person.total}
            </div>
            <div className="text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground">
              total
            </div>
          </div>
          <ChevronRight
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-150",
              expanded && "rotate-90"
            )}
          />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border/50 bg-muted/10 px-4 py-3 sm:px-5">
          <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Assignment timeline
          </div>
          <ul className="divide-y divide-border/40">
            {person.assignments.map((assignment) => (
              <li key={assignment.id} className="flex items-start gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="text-[13px] font-medium text-foreground">
                      {shortDate(assignment.meetingDate)}
                    </span>
                    <span className="text-[11.5px] text-muted-foreground">
                      {assignment.roleLabel}
                    </span>
                    {assignment.status ? (
                      <AssignmentStatusPill
                        status={assignment.status}
                        declineNote={assignment.declineNote}
                        onChange={() => {}}
                        interactive={false}
                      />
                    ) : null}
                  </div>
                  {assignment.topic ? (
                    <div className="mt-1 text-[12.5px] italic text-muted-foreground">
                      “{assignment.topic}”
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
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
