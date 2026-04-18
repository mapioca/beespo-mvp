"use client"

import { useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { addDays, format, startOfDay } from "date-fns"
import {
  CircleCheck,
  GripVertical,
  Landmark,
  Plus,
} from "lucide-react"
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

import { Breadcrumbs } from "@/components/dashboard/breadcrumbs"
import { cn } from "@/lib/utils"

type MeetingSpecialType = "standard" | "fast-testimony" | "ward-conference"
type AssignmentField = "presiding" | "conductor" | "chorister" | "accompanist"

type PlannerSunday = {
  isoDate: string
  dateLabel: string
  shortDateLabel: string
  dayLabel: string
  assignedCount: number
  totalCount: number
}

type SectionEntry = {
  id: string
  kind: "section"
  title: string
}

type StaticEntry = {
  id: string
  kind: "static"
  title: string
  detail?: string
}

type SpeakerEntry = {
  id: string
  kind: "speaker"
  title: string
  speakerName: string
}

type TestimonyEntry = {
  id: string
  kind: "testimony"
  title: string
  detail: string
}

type AgendaEntry = SectionEntry | StaticEntry | SpeakerEntry | TestimonyEntry

type PlannerMeetingState = {
  specialType: MeetingSpecialType
  assignments: Record<AssignmentField, string>
  standardEntries: AgendaEntry[]
  fastEntries: AgendaEntry[]
}

const DEMO_ASSIGNED_COUNTS = [6, 8, 0, 4, 7, 8, 3, 5]
const TOTAL_ASSIGNMENTS = 8
const SECTION_CLOSING_ID = "section-closing"

function getNextEightSundays(): PlannerSunday[] {
  const today = startOfDay(new Date())
  const currentDay = today.getDay()
  const daysUntilSunday = currentDay === 0 ? 0 : 7 - currentDay
  const firstSunday = addDays(today, daysUntilSunday)

  return Array.from({ length: 8 }, (_, index) => {
    const date = addDays(firstSunday, index * 7)
    return {
      isoDate: format(date, "yyyy-MM-dd"),
      dateLabel: format(date, "MMM d"),
      shortDateLabel: format(date, "MM/dd"),
      dayLabel: format(date, "EEE"),
      assignedCount: DEMO_ASSIGNED_COUNTS[index] ?? 0,
      totalCount: TOTAL_ASSIGNMENTS,
    }
  })
}

function createStandardEntries(isoDate: string): AgendaEntry[] {
  return [
    { id: "section-opening", kind: "section", title: "Opening" },
    { id: "opening-hymn", kind: "static", title: "Opening Hymn" },
    { id: "invocation", kind: "static", title: "Invocation" },
    { id: "ward-business", kind: "static", title: "Ward Business" },
    { id: "section-ordinance", kind: "section", title: "Ordinance" },
    { id: "sacrament-hymn", kind: "static", title: "Sacrament Hymn" },
    {
      id: "sacrament-ordinance",
      kind: "static",
      title: "Administration of the Sacrament",
      detail: "Blessing and passing of the sacrament",
    },
    { id: "section-messages", kind: "section", title: "Messages" },
    {
      id: `${isoDate}-speaker-1`,
      kind: "speaker",
      title: "Speaker",
      speakerName: "",
    },
    {
      id: `${isoDate}-speaker-2`,
      kind: "speaker",
      title: "Speaker",
      speakerName: "",
    },
    { id: SECTION_CLOSING_ID, kind: "section", title: "Closing" },
    { id: "closing-hymn", kind: "static", title: "Closing Hymn" },
    { id: "benediction", kind: "static", title: "Benediction" },
  ]
}

function createFastEntries(): AgendaEntry[] {
  return [
    { id: "section-opening", kind: "section", title: "Opening" },
    { id: "opening-hymn", kind: "static", title: "Opening Hymn" },
    { id: "invocation", kind: "static", title: "Invocation" },
    { id: "ward-business", kind: "static", title: "Ward Business" },
    { id: "section-ordinance", kind: "section", title: "Ordinance" },
    { id: "sacrament-hymn", kind: "static", title: "Sacrament Hymn" },
    {
      id: "sacrament-ordinance",
      kind: "static",
      title: "Administration of the Sacrament",
      detail: "Blessing and passing of the sacrament",
    },
    { id: "section-messages", kind: "section", title: "Messages" },
    {
      id: "testimonies",
      kind: "testimony",
      title: "Testimonies by members of the congregation",
      detail: "Open microphone format following the sacrament.",
    },
    { id: SECTION_CLOSING_ID, kind: "section", title: "Closing" },
    { id: "closing-hymn", kind: "static", title: "Closing Hymn" },
    { id: "benediction", kind: "static", title: "Benediction" },
  ]
}

function createInitialMeetingState(isoDate: string): PlannerMeetingState {
  return {
    specialType: "standard",
    assignments: {
      presiding: "",
      conductor: "",
      chorister: "",
      accompanist: "",
    },
    standardEntries: createStandardEntries(isoDate),
    fastEntries: createFastEntries(),
  }
}

function getMeetingTitle(specialType: MeetingSpecialType) {
  switch (specialType) {
    case "fast-testimony":
      return "Fast & Testimony Meeting"
    case "ward-conference":
      return "Ward Conference"
    default:
      return "Sacrament Meeting"
  }
}

function getMeetingBadge(specialType: MeetingSpecialType) {
  switch (specialType) {
    case "fast-testimony":
      return "Fast Sunday"
    case "ward-conference":
      return "Conference"
    default:
      return null
  }
}

export function SacramentMeetingPlannerClient() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  const sundays = useMemo(() => getNextEightSundays(), [])
  const [meetingsByDate, setMeetingsByDate] = useState<Record<string, PlannerMeetingState>>(() =>
    Object.fromEntries(
      sundays.map((sunday) => [sunday.isoDate, createInitialMeetingState(sunday.isoDate)])
    )
  )

  const selectedSunday = useMemo(() => {
    const selectedDate = searchParams.get("date")
    return sundays.find((sunday) => sunday.isoDate === selectedDate) ?? sundays[0]
  }, [searchParams, sundays])

  const selectedMeeting = meetingsByDate[selectedSunday.isoDate]
  const visibleEntries =
    selectedMeeting.specialType === "fast-testimony"
      ? selectedMeeting.fastEntries
      : selectedMeeting.standardEntries
  const selectedMeetingTitle = getMeetingTitle(selectedMeeting.specialType)

  const breadcrumbItems = useMemo(
    () => [
      { label: "Meetings", href: "/meetings/overview" },
      { label: "Sacrament Meeting", href: "/meetings/sacrament-meeting/planner" },
      { label: "Planner", href: "/meetings/sacrament-meeting/planner" },
      { label: selectedSunday.dateLabel },
    ],
    [selectedSunday.dateLabel]
  )

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const handleSelectSunday = (isoDate: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("date", isoDate)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const updateSelectedMeeting = (updater: (meeting: PlannerMeetingState) => PlannerMeetingState) => {
    setMeetingsByDate((prev) => ({
      ...prev,
      [selectedSunday.isoDate]: updater(prev[selectedSunday.isoDate]),
    }))
  }

  const handleSpecialTypeToggle = (nextType: Exclude<MeetingSpecialType, "standard">) => {
    updateSelectedMeeting((meeting) => ({
      ...meeting,
      specialType: meeting.specialType === nextType ? "standard" : nextType,
    }))
  }

  const handleAssignmentChange = (field: AssignmentField, value: string) => {
    updateSelectedMeeting((meeting) => ({
      ...meeting,
      assignments: {
        ...meeting.assignments,
        [field]: value,
      },
    }))
  }

  const handleSpeakerNameChange = (entryId: string, speakerName: string) => {
    updateSelectedMeeting((meeting) => ({
      ...meeting,
      standardEntries: meeting.standardEntries.map((entry) =>
        entry.id === entryId && entry.kind === "speaker"
          ? { ...entry, speakerName }
          : entry
      ),
    }))
  }

  const handleAddSpeaker = () => {
    updateSelectedMeeting((meeting) => {
      const nextSpeakerId = `${selectedSunday.isoDate}-speaker-${Date.now()}`
      const nextSpeaker: SpeakerEntry = {
        id: nextSpeakerId,
        kind: "speaker",
        title: "Speaker",
        speakerName: "",
      }
      const closingIndex = meeting.standardEntries.findIndex((entry) => entry.id === SECTION_CLOSING_ID)
      const insertAt = closingIndex === -1 ? meeting.standardEntries.length : closingIndex
      const nextEntries = [...meeting.standardEntries]
      nextEntries.splice(insertAt, 0, nextSpeaker)

      return {
        ...meeting,
        standardEntries: nextEntries,
      }
    })
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) {
      return
    }

    updateSelectedMeeting((meeting) => {
      const sourceEntries =
        meeting.specialType === "fast-testimony" ? meeting.fastEntries : meeting.standardEntries
      const oldIndex = sourceEntries.findIndex((entry) => entry.id === active.id)
      const newIndex = sourceEntries.findIndex((entry) => entry.id === over.id)

      if (oldIndex === -1 || newIndex === -1) {
        return meeting
      }

      const reordered = arrayMove(sourceEntries, oldIndex, newIndex)

      return meeting.specialType === "fast-testimony"
        ? { ...meeting, fastEntries: reordered }
        : { ...meeting, standardEntries: reordered }
    })
  }

  const messagesInsertIndex = visibleEntries.findIndex((entry) => entry.id === SECTION_CLOSING_ID)

  return (
    <div className="min-h-full">
      <Breadcrumbs items={breadcrumbItems} />
      <div className="mx-auto flex w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex min-h-[calc(100vh-9rem)] flex-col overflow-hidden rounded-2xl border border-border/70 bg-background shadow-[0_1px_2px_rgba(15,23,42,0.04)] lg:flex-row">
          <aside className="w-full shrink-0 border-b border-border/60 bg-[linear-gradient(180deg,#ffffff_0%,#fcfcfb_100%)] lg:w-72 lg:border-b-0 lg:border-r">
            <div className="border-b border-border/60 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Upcoming Sundays
              </p>
            </div>
            <div className="flex flex-col p-2">
              {sundays.map((sunday) => {
                const meeting = meetingsByDate[sunday.isoDate]
                const isSelected = sunday.isoDate === selectedSunday.isoDate
                const isFullyAssigned = sunday.assignedCount === sunday.totalCount
                const meetingBadge = getMeetingBadge(meeting.specialType)

                return (
                  <button
                    key={sunday.isoDate}
                    type="button"
                    onClick={() => handleSelectSunday(sunday.isoDate)}
                    className={cn(
                      "group rounded-xl px-3 py-3 text-left transition-colors duration-150",
                      isSelected
                        ? "bg-[#f7f7f6] ring-1 ring-border/70"
                        : "hover:bg-[#fafaf9]"
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[15px] font-medium tracking-tight text-foreground">
                        {sunday.dateLabel}
                      </div>
                      {meetingBadge ? (
                        <span className="rounded-full border border-border/70 bg-background px-2 py-0.5 text-[10px] font-medium tracking-[0.02em] text-muted-foreground">
                          {meetingBadge}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-3">
                      <span className="text-[12px] font-medium text-muted-foreground">
                        {sunday.dayLabel}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
                        {isFullyAssigned ? (
                          <CircleCheck className="h-3.5 w-3.5 text-emerald-600" />
                        ) : null}
                        <span>
                          {sunday.assignedCount}/{sunday.totalCount} assigned
                        </span>
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </aside>

          <section className="min-w-0 flex-1 bg-[linear-gradient(180deg,#ffffff_0%,#fbfbfa_100%)]">
            <div className="flex h-full flex-col">
              <div className="border-b border-border/60 px-6 py-5">
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Planner
                      </p>
                      <div className="mt-2 flex items-center gap-3">
                        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                          {selectedMeetingTitle}
                        </h1>
                        {selectedMeeting.specialType === "ward-conference" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                            <Landmark className="h-3.5 w-3.5" />
                            Ward Conference
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {selectedSunday.dayLabel} {selectedSunday.shortDateLabel}
                      </p>
                    </div>

                    <div className="inline-flex rounded-xl border border-border/70 bg-[#fafaf9] p-1">
                      <button
                        type="button"
                        onClick={() => handleSpecialTypeToggle("fast-testimony")}
                        className={cn(
                          "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                          selectedMeeting.specialType === "fast-testimony"
                            ? "bg-white text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        Fast &amp; Testimony
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSpecialTypeToggle("ward-conference")}
                        className={cn(
                          "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                          selectedMeeting.specialType === "ward-conference"
                            ? "bg-white text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        Ward Conference
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <AssignmentInput
                      label="Presiding"
                      value={selectedMeeting.assignments.presiding}
                      onChange={(value) => handleAssignmentChange("presiding", value)}
                    />
                    <AssignmentInput
                      label="Conductor"
                      value={selectedMeeting.assignments.conductor}
                      onChange={(value) => handleAssignmentChange("conductor", value)}
                    />
                    <AssignmentInput
                      label="Chorister"
                      value={selectedMeeting.assignments.chorister}
                      onChange={(value) => handleAssignmentChange("chorister", value)}
                    />
                    <AssignmentInput
                      label="Organist / Pianist"
                      value={selectedMeeting.assignments.accompanist}
                      onChange={(value) => handleAssignmentChange("accompanist", value)}
                    />
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-auto px-6 py-5">
                <div className="mx-auto w-full max-w-3xl">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={visibleEntries.map((entry) => entry.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-1.5">
                        {visibleEntries.map((entry, index) => (
                          <div key={entry.id}>
                            <AgendaRow
                              entry={entry}
                              onSpeakerNameChange={handleSpeakerNameChange}
                            />
                            {selectedMeeting.specialType !== "fast-testimony" &&
                            messagesInsertIndex > 0 &&
                            index === messagesInsertIndex - 1 ? (
                              <div className="px-1 py-2">
                                <button
                                  type="button"
                                  onClick={handleAddSpeaker}
                                  className="inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-[#fafaf9] hover:text-foreground"
                                >
                                  <Plus className="h-4 w-4" />
                                  Add speaker
                                </button>
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function AssignmentInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="rounded-xl border border-border/70 bg-[#fcfcfb] px-3 py-2.5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Add name"
        className="mt-1 w-full border-0 bg-transparent p-0 text-sm text-foreground outline-none placeholder:text-muted-foreground"
      />
    </label>
  )
}

function AgendaRow({
  entry,
  onSpeakerNameChange,
}: {
  entry: AgendaEntry
  onSpeakerNameChange: (entryId: string, speakerName: string) => void
}) {
  const canDrag = entry.kind !== "section"
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: entry.id,
    disabled: !canDrag,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  if (entry.kind === "section") {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="pt-3 first:pt-0"
      >
        <div className="px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {entry.title}
        </div>
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group rounded-xl border border-border/70 bg-white px-3 py-3 transition-shadow",
        isDragging && "shadow-lg"
      )}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          className={cn(
            "mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors",
            canDrag ? "cursor-grab hover:bg-[#f6f6f5] hover:text-foreground" : "cursor-default"
          )}
          {...(canDrag ? attributes : {})}
          {...(canDrag ? listeners : {})}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-foreground">
            {entry.title}
          </div>
          {entry.kind === "speaker" ? (
            <input
              value={entry.speakerName}
              onChange={(event) => onSpeakerNameChange(entry.id, event.target.value)}
              placeholder="Assign speaker"
              className="mt-1 w-full border-0 bg-transparent p-0 text-sm text-muted-foreground outline-none placeholder:text-muted-foreground"
            />
          ) : entry.detail ? (
            <div className="mt-1 text-sm text-muted-foreground">
              {entry.detail}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
