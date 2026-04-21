"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { addDays, format, isBefore, startOfDay } from "date-fns"
import {
  CalendarDays,
  CircleCheck,
  CircleCheckBig,
  CircleDashed,
  CircleDot,
  Clock3,
  Eye,
  GripVertical,
  Loader2,
  MoreHorizontal,
  PencilLine,
  Play,
  Plus,
  Search,
  Shredder,
  Trash2,
  UserCheck,
  X,
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
import { SacramentMeetingAudienceView } from "@/components/meetings/sacrament-meeting/audience-client"
import { ConductView } from "@/components/meetings/sacrament-meeting/conduct-view"
import { HymnSelectorModal } from "@/components/meetings/hymn-selector-modal"
import { AnnouncementSelectorPopover } from "@/components/meetings/builder/announcement-selector-popover"
import { BusinessSelectorPopover } from "@/components/meetings/builder/business-selector-popover"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { PickerModal } from "@/components/ui/picker-modal"

type MeetingSpecialType =
  | "standard"
  | "fast-testimony"
  | "general-conference"
  | "stake-conference"
  | "ward-conference"
type AssignmentField = "presiding" | "conductor" | "chorister" | "accompanist"
type AgendaAssigneeField = "invocation" | "benediction"
type SacramentAssignmentRole = "blessing" | "passing"
type DirectoryTarget =
  | { type: "assignment"; field: AssignmentField }
  | { type: "agenda-assignee"; entryId: string; field: AgendaAssigneeField }
  | { type: "sacrament-assignment"; role: SacramentAssignmentRole }
  | { type: "speaker"; entryId: string }
type HymnTarget = { entryId: string }
type PlannerTab = "meeting" | "horizon" | "notes"
type PlannerStatus = "draft" | "ready" | "done"

type PlannerSunday = {
  isoDate: string
  dateLabel: string
  shortDateLabel: string
  dayLabel: string
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
  assigneeField?: AgendaAssigneeField
  assigneeName?: string
  hymnId?: string
  hymnNumber?: number
  hymnTitle?: string
  removable?: boolean
}

type SpeakerEntry = {
  id: string
  kind: "speaker"
  title: string
  speakerName: string
  topic: string
  durationMinutes: number | null
}

type TestimonyEntry = {
  id: string
  kind: "testimony"
  title: string
  detail: string
}

type AgendaEntry = SectionEntry | StaticEntry | SpeakerEntry | TestimonyEntry

type PlannerMeetingState = {
  title: string
  specialType: MeetingSpecialType
  assignments: Record<AssignmentField, string>
  sacramentAssignments: Record<SacramentAssignmentRole, string[]>
  standardEntries: AgendaEntry[]
  fastEntries: AgendaEntry[]
}

type DirectoryPerson = {
  id: string
  name: string
}

type PlannerItem = {
  id: string
  title: string
  checked: boolean
}

type PlannerNotes = {
  announcements: PlannerItem[]
  business: PlannerItem[]
  notes: string
  initialized?: boolean
}

const SECTION_CLOSING_ID = "section-closing"
const PLANNER_DRAFT_STORAGE_KEY = "beespo:sacrament-meeting:planner:draft:v1"

type Lang = "ENG" | "SPA"

const ENTRY_LABELS: Record<string, Record<Lang, string>> = {
  "section-opening":     { ENG: "Opening",                          SPA: "Apertura" },
  "opening-hymn":        { ENG: "Opening Hymn",                     SPA: "Himno de Apertura" },
  "invocation":          { ENG: "Invocation",                       SPA: "Primera Oración" },
  "ward-business":       { ENG: "Ward Business",                    SPA: "Asuntos del Barrio" },
  "section-ordinance":   { ENG: "Sacrament",                        SPA: "Santa Cena" },
  "sacrament-hymn":      { ENG: "Sacrament Hymn",                   SPA: "Himno Sacramental" },
  "sacrament-ordinance": { ENG: "Administration of the Sacrament",  SPA: "Administración de la Santa Cena" },
  "section-messages":    { ENG: "Messages",                         SPA: "Mensajes" },
  [SECTION_CLOSING_ID]:  { ENG: "Closing",                          SPA: "Clausura" },
  "closing-hymn":        { ENG: "Closing Hymn",                     SPA: "Himno de Clausura" },
  "benediction":         { ENG: "Benediction",                      SPA: "Última Oración" },
}

const SPEAKER_LABEL: Record<Lang, string> = { ENG: "Speaker", SPA: "Discursante" }
const INTERMEDIATE_HYMN_LABEL: Record<Lang, string> = { ENG: "Intermediate Hymn", SPA: "Himno Intermedio" }
const SPECIAL_NUMBER_LABEL: Record<Lang, string> = { ENG: "Special Number", SPA: "Número Especial" }
const AUTOSAVE_DELAY_MS = 1500
const DEFAULT_VISIBLE_SUNDAYS = 8
const VISIBLE_SUNDAY_INCREMENT = 8
const SPEAKER_TIME_OPTIONS = [
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  10,
  12,
  15,
  18,
  20,
]
const MEETING_TYPE_OPTIONS: { value: MeetingSpecialType; label: string }[] = [
  { value: "standard", label: "Regular Sacrament Meeting" },
  { value: "fast-testimony", label: "Fast & Testimony Meeting" },
  { value: "general-conference", label: "General Conference" },
  { value: "stake-conference", label: "Stake Conference" },
  { value: "ward-conference", label: "Ward Conference" },
]

function toPlannerSunday(date: Date): PlannerSunday {
  return {
    isoDate: format(date, "yyyy-MM-dd"),
    dateLabel: format(date, "MMM d"),
    shortDateLabel: format(date, "MM/dd"),
    dayLabel: format(date, "EEE"),
  }
}

function getSundayOnOrAfter(date: Date): Date {
  const normalizedDate = startOfDay(date)
  const currentDay = normalizedDate.getDay()
  const daysUntilSunday = currentDay === 0 ? 0 : 7 - currentDay
  return addDays(normalizedDate, daysUntilSunday)
}

function getUpcomingSundays(count = 26): PlannerSunday[] {
  const firstSunday = getSundayOnOrAfter(new Date())

  return Array.from({ length: count }, (_, index) => toPlannerSunday(addDays(firstSunday, index * 7)))
}

function plannerSundayDateFromIso(isoDate: string): Date {
  return new Date(`${isoDate}T12:00:00`)
}

function plannerMeetingEndDateFromIso(isoDate: string): Date {
  return new Date(`${isoDate}T10:00:00`)
}

function isFirstSundayOfMonth(isoDate: string) {
  return plannerSundayDateFromIso(isoDate).getDate() <= 7
}

function isGeneralConferenceSunday(isoDate: string) {
  const date = plannerSundayDateFromIso(isoDate)
  const month = date.getMonth()

  return (month === 3 || month === 9) && isFirstSundayOfMonth(isoDate)
}

function getDefaultMeetingSpecialType(isoDate: string): MeetingSpecialType {
  if (isGeneralConferenceSunday(isoDate)) {
    return "general-conference"
  }

  if (isFirstSundayOfMonth(isoDate)) {
    return "fast-testimony"
  }

  return "standard"
}

function translateEntries(entries: AgendaEntry[], lang: Lang): AgendaEntry[] {
  return entries.map((entry) => {
    if (entry.kind === "section" || entry.kind === "static") {
      const label = ENTRY_LABELS[entry.id]
      if (label) {
        const translated: typeof entry = { ...entry, title: label[lang] }
        if (entry.kind === "static" && entry.id === "sacrament-ordinance") {
          return {
            ...translated,
            detail: lang === "SPA" ? "Bendición y distribución de la santa cena" : "Blessing and passing of the sacrament",
          } as StaticEntry
        }
        return translated
      }
    }
    if (entry.kind === "speaker") {
      const isGenericTitle = entry.title === SPEAKER_LABEL["ENG"] || entry.title === SPEAKER_LABEL["SPA"]
      if (isGenericTitle) {
        return { ...entry, title: SPEAKER_LABEL[lang] }
      }
    }
    if (entry.kind === "static" && entry.removable) {
      const isIntermediateHymn = entry.title === INTERMEDIATE_HYMN_LABEL["ENG"] || entry.title === INTERMEDIATE_HYMN_LABEL["SPA"]
      if (isIntermediateHymn) return { ...entry, title: INTERMEDIATE_HYMN_LABEL[lang] }
      const isSpecialNumber = entry.title === SPECIAL_NUMBER_LABEL["ENG"] || entry.title === SPECIAL_NUMBER_LABEL["SPA"]
      if (isSpecialNumber) return { ...entry, title: SPECIAL_NUMBER_LABEL[lang] }
    }
    if (entry.kind === "testimony") {
      return {
        ...entry,
        title: lang === "SPA" ? "Testimonios de miembros de la congregación" : "Testimonies by members of the congregation",
        detail: lang === "SPA" ? "Formato de micrófono abierto después de la santa cena." : "Open microphone format following the sacrament.",
      } as TestimonyEntry
    }
    return entry
  })
}

function getVisibleAgendaEntries(meeting: PlannerMeetingState) {
  return meeting.specialType === "fast-testimony"
    ? meeting.fastEntries
    : meeting.standardEntries
}

function getPlannerAssignmentStats(meeting: PlannerMeetingState) {
  const entries = getVisibleAgendaEntries(meeting)
  let assignedCount = 0
  let totalCount = 0
  let optionalAssignedCount = 0

  for (const assignment of Object.values(meeting.assignments)) {
    totalCount += 1
    if (assignment.trim()) {
      assignedCount += 1
    }
  }

  for (const assignments of Object.values(meeting.sacramentAssignments)) {
    optionalAssignedCount += assignments.filter((person) => person.trim()).length
  }

  for (const entry of entries) {
    if (entry.kind === "speaker") {
      totalCount += 1
      if (entry.speakerName.trim()) {
        assignedCount += 1
      }
      continue
    }

    if (entry.kind !== "static") {
      continue
    }

    if (typeof entry.hymnId !== "undefined") {
      totalCount += 1
      if (entry.hymnId) {
        assignedCount += 1
      }
      continue
    }

    if (entry.assigneeField) {
      totalCount += 1
      if (entry.assigneeName?.trim()) {
        assignedCount += 1
      }
    }
  }

  return { assignedCount, optionalAssignedCount, totalCount }
}

function getDerivedPlannerStatus(isoDate: string, meeting: PlannerMeetingState): PlannerStatus {
  if (isBefore(plannerMeetingEndDateFromIso(isoDate), new Date())) {
    return "done"
  }

  const stats = getPlannerAssignmentStats(meeting)

  return stats.totalCount > 0 && stats.assignedCount === stats.totalCount ? "ready" : "draft"
}

function getPlannerStatusLabel(status: PlannerStatus) {
  switch (status) {
    case "ready":
      return "Ready"
    case "done":
      return "Done"
    default:
      return "Draft"
  }
}

function getMeetingTypeLabel(specialType: MeetingSpecialType) {
  return MEETING_TYPE_OPTIONS.find((option) => option.value === specialType)?.label ?? "Regular"
}

function getDefaultMeetingTitle(specialType: MeetingSpecialType) {
  return specialType === "standard" ? "Untitled" : getMeetingTypeLabel(specialType)
}

function getMeetingListTitle(meeting: PlannerMeetingState) {
  return meeting.title.trim() || (meeting.specialType === "standard" ? "" : getMeetingTypeLabel(meeting.specialType))
}

type EditableMeetingTitleProps = {
  value: string
  placeholder: string
  onChange: (value: string) => void
}

function EditableMeetingTitle({ value, placeholder, onChange }: EditableMeetingTitleProps) {
  return (
    <div className="group relative mt-1 flex max-w-3xl items-center gap-2 rounded-xl -ml-2 px-2 py-0 transition-colors hover:bg-muted/50 focus-within:bg-background focus-within:ring-1 focus-within:ring-border/80">
      <input
        aria-label="Meeting title"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent p-0 font-serif text-[34px] font-normal leading-none tracking-[-0.02em] text-foreground outline-none placeholder:italic placeholder:text-muted-foreground"
      />
      <PencilLine className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-70 group-focus-within:opacity-70" />
    </div>
  )
}

type PlannerStatusBadgeProps = {
  status: PlannerStatus
}

function PlannerStatusBadge({ status }: PlannerStatusBadgeProps) {
  const Icon = status === "ready" ? CircleDot : status === "done" ? CircleCheckBig : CircleDashed
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium",
        status === "ready"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
          : status === "done"
            ? "border-stone-200 bg-stone-100 text-stone-700 dark:border-stone-700 dark:bg-stone-800/50 dark:text-stone-400"
            : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400"
      )}
    >
      <Icon className="h-3 w-3" />
      {getPlannerStatusLabel(status)}
    </div>
  )
}

type MeetingTypeSelectProps = {
  value: MeetingSpecialType
  onChange: (value: MeetingSpecialType) => void
}

function MeetingTypeSelect({ value, onChange }: MeetingTypeSelectProps) {
  return (
    <div className="inline-flex items-center">
      <Select
        value={value}
        onValueChange={(nextValue) => onChange(nextValue as MeetingSpecialType)}
      >
        <SelectTrigger className="h-auto w-auto gap-1.5 rounded-md border-0 bg-transparent px-0 py-0 font-serif text-[15px] italic text-muted-foreground shadow-none underline decoration-border decoration-dotted underline-offset-4 transition-colors hover:text-foreground focus:border-0 focus:text-foreground focus:ring-0 focus:ring-offset-0 [&>svg]:h-3.5 [&>svg]:w-3.5">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="rounded-xl">
          {MEETING_TYPE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function createStandardEntries(isoDate: string, lang: Lang = "ENG"): AgendaEntry[] {
  const t = (id: string) => ENTRY_LABELS[id]?.[lang] ?? ENTRY_LABELS[id]?.["ENG"] ?? id
  return [
    { id: "section-opening", kind: "section", title: t("section-opening") },
    { id: "opening-hymn", kind: "static", title: t("opening-hymn"), hymnId: "", hymnTitle: "" },
    {
      id: "invocation",
      kind: "static",
      title: t("invocation"),
      assigneeField: "invocation",
      assigneeName: "",
    },
    { id: "ward-business", kind: "static", title: t("ward-business") },
    { id: "section-ordinance", kind: "section", title: t("section-ordinance") },
    { id: "sacrament-hymn", kind: "static", title: t("sacrament-hymn"), hymnId: "", hymnTitle: "" },
    {
      id: "sacrament-ordinance",
      kind: "static",
      title: t("sacrament-ordinance"),
      detail: lang === "SPA" ? "Bendición y distribución de la santa cena" : "Blessing and passing of the sacrament",
    },
    { id: "section-messages", kind: "section", title: t("section-messages") },
    {
      id: `${isoDate}-speaker-1`,
      kind: "speaker",
      title: SPEAKER_LABEL[lang],
      speakerName: "",
      topic: "",
      durationMinutes: null,
    },
    {
      id: `${isoDate}-speaker-2`,
      kind: "speaker",
      title: SPEAKER_LABEL[lang],
      speakerName: "",
      topic: "",
      durationMinutes: null,
    },
    { id: SECTION_CLOSING_ID, kind: "section", title: t(SECTION_CLOSING_ID) },
    { id: "closing-hymn", kind: "static", title: t("closing-hymn"), hymnId: "", hymnTitle: "" },
    {
      id: "benediction",
      kind: "static",
      title: t("benediction"),
      assigneeField: "benediction",
      assigneeName: "",
    },
  ]
}

function createFastEntries(lang: Lang = "ENG"): AgendaEntry[] {
  const t = (id: string) => ENTRY_LABELS[id]?.[lang] ?? ENTRY_LABELS[id]?.["ENG"] ?? id
  return [
    { id: "section-opening", kind: "section", title: t("section-opening") },
    { id: "opening-hymn", kind: "static", title: t("opening-hymn"), hymnId: "", hymnTitle: "" },
    {
      id: "invocation",
      kind: "static",
      title: t("invocation"),
      assigneeField: "invocation",
      assigneeName: "",
    },
    { id: "ward-business", kind: "static", title: t("ward-business") },
    { id: "section-ordinance", kind: "section", title: t("section-ordinance") },
    { id: "sacrament-hymn", kind: "static", title: t("sacrament-hymn"), hymnId: "", hymnTitle: "" },
    {
      id: "sacrament-ordinance",
      kind: "static",
      title: t("sacrament-ordinance"),
      detail: lang === "SPA" ? "Bendición y distribución de la santa cena" : "Blessing and passing of the sacrament",
    },
    { id: "section-messages", kind: "section", title: t("section-messages") },
    {
      id: "testimonies",
      kind: "testimony",
      title: lang === "SPA" ? "Testimonios de miembros de la congregación" : "Testimonies by members of the congregation",
      detail: lang === "SPA" ? "Formato de micrófono abierto después de la santa cena." : "Open microphone format following the sacrament.",
    },
    { id: SECTION_CLOSING_ID, kind: "section", title: t(SECTION_CLOSING_ID) },
    { id: "closing-hymn", kind: "static", title: t("closing-hymn"), hymnId: "", hymnTitle: "" },
    {
      id: "benediction",
      kind: "static",
      title: t("benediction"),
      assigneeField: "benediction",
      assigneeName: "",
    },
  ]
}

function createInitialMeetingState(isoDate: string, lang: Lang = "ENG"): PlannerMeetingState {
  return {
    title: "",
    specialType: getDefaultMeetingSpecialType(isoDate),
    assignments: {
      presiding: "",
      conductor: "",
      chorister: "",
      accompanist: "",
    },
    sacramentAssignments: {
      blessing: [],
      passing: [],
    },
    standardEntries: createStandardEntries(isoDate, lang),
    fastEntries: createFastEntries(lang),
  }
}

function getMeetingTitle(specialType: MeetingSpecialType) {
  switch (specialType) {
    case "fast-testimony":
      return "Fast & Testimony Meeting"
    case "general-conference":
      return "General Conference"
    case "stake-conference":
      return "Stake Conference"
    case "ward-conference":
      return "Ward Conference"
    default:
      return "Sacrament Meeting"
  }
}

function getUpcomingMeetingKind(meeting: PlannerMeetingState) {
  switch (meeting.specialType) {
    case "fast-testimony":
      return { label: "Fast", className: "bg-brand/15 text-brand" }
    case "general-conference":
      return { label: "General", className: "bg-brand/10 text-brand" }
    case "stake-conference":
      return { label: "Stake", className: "bg-[#eaf7ef] text-[#2f8f54] dark:bg-emerald-950 dark:text-emerald-400" }
    case "ward-conference":
      return { label: "Ward", className: "bg-[#f0f9ff] text-[#0369a1] dark:bg-sky-950 dark:text-sky-400" }
    default:
      return { label: "Regular", className: "bg-muted text-muted-foreground" }
  }
}

function getUpcomingDateParts(isoDate: string) {
  const date = plannerSundayDateFromIso(isoDate)
  return {
    month: format(date, "MMM"),
    day: format(date, "d"),
  }
}

function getHorizonSpeakers(meeting: PlannerMeetingState) {
  return meeting.standardEntries.filter(
    (entry): entry is SpeakerEntry => entry.kind === "speaker" && !!entry.speakerName.trim()
  )
}

type PlannerTabsProps = {
  activeTab: PlannerTab
  onTabChange: (tab: PlannerTab) => void
}

function PlannerTabs({ activeTab, onTabChange }: PlannerTabsProps) {
  const tabs: { value: PlannerTab; label: string }[] = [
    { value: "meeting", label: "This meeting" },
    { value: "horizon", label: "Next 3 months" },
    { value: "notes", label: "Notes" },
  ]

  return (
    <div className="flex items-center gap-6 border-b border-border/60 px-6">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onTabChange(tab.value)}
          className={cn(
            "relative py-3 text-[13px] font-medium transition-colors",
            activeTab === tab.value
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {tab.label}
          {activeTab === tab.value ? (
            <span className="absolute inset-x-0 -bottom-px h-px bg-foreground" />
          ) : null}
        </button>
      ))}
    </div>
  )
}

type HorizonPanelProps = {
  sundays: PlannerSunday[]
  meetingsByDate: Record<string, PlannerMeetingState>
  defaultLanguage: Lang
  onOpen: (isoDate: string) => void
}

function HorizonPanel({ sundays, meetingsByDate, defaultLanguage, onOpen }: HorizonPanelProps) {
  return (
    <div className="px-6 py-6">
      <p className="mb-5 max-w-xl text-[13.5px] leading-6 text-muted-foreground">
        Plan speakers and themes up to three months ahead. Click any week to open the full program.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {sundays.slice(0, 12).map((sunday) => {
          const meeting =
            meetingsByDate[sunday.isoDate] ??
            createInitialMeetingState(sunday.isoDate, defaultLanguage)
          const speakers = getHorizonSpeakers(meeting)
          const title = getMeetingListTitle(meeting)
          const kind = getUpcomingMeetingKind(meeting)

          return (
            <button
              key={sunday.isoDate}
              type="button"
              onClick={() => onOpen(sunday.isoDate)}
              className="flex min-h-[170px] flex-col rounded-xl border border-border/70 bg-surface-raised px-4 py-3 text-left transition-colors hover:border-border hover:bg-surface-hover"
            >
              <div className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                {sunday.dayLabel} · {sunday.dateLabel}
              </div>
              <div className="mt-1 font-serif text-[22px] leading-tight text-foreground">
                {title ? title : <span className="text-[15px] italic text-muted-foreground">Untitled</span>}
              </div>
              <div className="mt-4 flex flex-col gap-1">
                {meeting.specialType !== "standard" ? (
                  <div className="font-serif text-[13.5px] italic text-muted-foreground">
                    {getMeetingTitle(meeting.specialType)}
                  </div>
                ) : speakers.length > 0 ? (
                  speakers.map((speaker, index) => (
                    <div key={`${speaker.id}-${index}`} className="font-serif text-[13.5px] leading-snug text-muted-foreground">
                      {speaker.speakerName}
                    </div>
                  ))
                ) : (
                  <div className="font-serif text-[13.5px] italic text-muted-foreground">No speakers assigned</div>
                )}
              </div>
              <span
                className={cn(
                  "mt-auto self-start rounded-full px-1.5 py-[2px] text-[9.5px] font-medium uppercase tracking-[0.04em]",
                  kind.className
                )}
              >
                {kind.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

type NotesPanelProps = {
  notes: PlannerNotes
  onNotesChange: (value: string) => void
}

function NotesPanel({ notes, onNotesChange }: NotesPanelProps) {
  return (
    <div className="grid max-w-3xl gap-6 px-6 py-6">
      <div className="rounded-xl border border-border/70 bg-card px-3 py-3">
        <textarea
          className="min-h-48 w-full resize-y bg-transparent text-sm leading-6 outline-none placeholder:text-muted-foreground"
          placeholder="Private bishopric notes — not shared with the congregation..."
          value={notes.notes}
          onChange={(event) => onNotesChange(event.target.value)}
        />
      </div>
    </div>
  )
}

type SectionHeaderProps = {
  label: string
  number: string
}

function SectionHeader({ label, number }: SectionHeaderProps) {
  return (
    <div className="mb-2.5 flex items-center gap-2.5">
      <div className="font-serif text-[14px] italic text-muted-foreground">{label}</div>
      <div className="h-px flex-1 bg-border/70" />
      <div className="text-[11px] font-medium tracking-[0.04em] text-muted-foreground">{number}</div>
    </div>
  )
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "+"
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("")
}

type PresidencyAndMusicSectionProps = {
  assignments: PlannerMeetingState["assignments"]
  onSelect: (field: AssignmentField) => void
}

function PresidencyAndMusicSection({ assignments, onSelect }: PresidencyAndMusicSectionProps) {
  return (
    <div>
      <SectionHeader label="Presidency & music" number="01" />
      <div className="grid gap-2.5 sm:grid-cols-2">
        <AssignmentCard
          role="Presiding"
          name={assignments.presiding}
          onClick={() => onSelect("presiding")}
        />
        <AssignmentCard
          role="Conducting"
          name={assignments.conductor}
          onClick={() => onSelect("conductor")}
        />
        <AssignmentCard
          role="Chorister"
          name={assignments.chorister}
          onClick={() => onSelect("chorister")}
        />
        <AssignmentCard
          role="Organist"
          name={assignments.accompanist}
          onClick={() => onSelect("accompanist")}
        />
      </div>
    </div>
  )
}

type AssignmentCardProps = {
  role: string
  name: string
  onClick: () => void
}

function AssignmentCard({ role, name, onClick }: AssignmentCardProps) {
  const assignedName = name.trim()

  return (
    <button
      className="flex items-center gap-3 rounded-xl border border-border/70 bg-surface-raised px-3.5 py-3 text-left transition-colors hover:border-border hover:bg-surface-hover"
      onClick={onClick}
      type="button"
    >
      <div
        className={cn(
          "grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold",
          assignedName
            ? "bg-surface-sunken text-muted-foreground"
            : "border border-dashed border-border bg-transparent text-muted-foreground"
        )}
      >
        {assignedName ? getInitials(assignedName) : "+"}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
          {role}
        </div>
        <div
          className={cn(
            "mt-0.5 truncate font-serif text-[15.5px]",
            assignedName ? "text-foreground" : "italic text-muted-foreground"
          )}
        >
          {assignedName || "Unassigned"}
        </div>
      </div>
      <ChevronRightIcon />
    </button>
  )
}

function ChevronRightIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
    </svg>
  )
}

function getStaticEntry(entries: AgendaEntry[], id: string) {
  return entries.find((entry): entry is StaticEntry => entry.kind === "static" && entry.id === id)
}

type OpeningSectionProps = {
  entries: AgendaEntry[]
  onPickHymn: (entryId: string) => void
  onPickPrayer: (entryId: string, field: AgendaAssigneeField) => void
}

function OpeningSection({ entries, onPickHymn, onPickPrayer }: OpeningSectionProps) {
  const openingHymn = getStaticEntry(entries, "opening-hymn")
  const invocation = getStaticEntry(entries, "invocation")

  return (
    <div>
      <SectionHeader label="Opening" number="02" />
      {openingHymn ? (
        <HymnPlanningRow
          type="Opening hymn"
          hymnNumber={openingHymn.hymnNumber}
          hymnTitle={openingHymn.hymnTitle}
          onClick={() => onPickHymn(openingHymn.id)}
        />
      ) : null}
      {invocation ? (
        <PrayerPlanningRow
          type="Invocation"
          personName={invocation.assigneeName}
          onClick={() => onPickPrayer(invocation.id, "invocation")}
        />
      ) : null}
    </div>
  )
}

type ItemsRowProps = {
  type: string
  items: PlannerItem[]
  onClick: () => void
}

function ItemsRow({ type, items, onClick }: ItemsRowProps) {
  const checkedCount = items.filter((item) => item.checked).length
  const totalCount = items.length

  return (
    <button
      className="mb-2 grid w-full grid-cols-[100px_1fr_auto] items-center gap-3.5 rounded-xl border border-border/70 bg-surface-raised px-3.5 py-3 text-left transition-colors hover:border-border hover:bg-surface-hover"
      onClick={onClick}
      type="button"
    >
      <div className="text-[10.5px] font-medium uppercase tracking-[0.05em] text-muted-foreground">
        {type}
      </div>
      <div className="min-w-0">
        {totalCount === 0 ? (
          <span className="font-serif text-[15.5px] italic text-muted-foreground">None added</span>
        ) : (
          <span className="font-serif text-[15.5px] text-foreground">
            {checkedCount} {type.toLowerCase()}{checkedCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>
      <ChevronRightIcon />
    </button>
  )
}

type ItemsPickerModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  items: PlannerItem[]
  onChange: (items: PlannerItem[]) => void
  addTrigger: React.ReactNode
}

function ItemsPickerModal({
  open,
  onOpenChange,
  title,
  items,
  onChange,
  addTrigger,
}: ItemsPickerModalProps) {
  const handleToggle = (id: string) => {
    onChange(items.map((item) => item.id === id ? { ...item, checked: !item.checked } : item))
  }

  const handleDelete = (id: string) => {
    onChange(items.filter((item) => item.id !== id))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-[520px] gap-0 overflow-hidden rounded-2xl border-border/80 p-0 shadow-2xl">
        <DialogHeader className="border-b border-border/70 px-[18px] py-3.5">
          <DialogTitle className="font-serif text-[15px] font-normal text-foreground">
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[360px] overflow-y-auto py-1">
          {items.length === 0 ? (
            <div className="px-5 py-8 text-center text-[13px] text-muted-foreground">
              No {title.toLowerCase()} added yet.
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 px-[18px] py-2.5 transition-colors hover:bg-muted/50"
              >
                <button
                  type="button"
                  onClick={() => handleToggle(item.id)}
                  className={cn(
                    "flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border transition-colors",
                    item.checked
                      ? "border-foreground bg-foreground text-white"
                      : "border-border bg-background"
                  )}
                  aria-label={item.checked ? `Uncheck ${item.title}` : `Check ${item.title}`}
                >
                  {item.checked ? (
                    <svg className="h-2.5 w-2.5" viewBox="0 0 12 10" fill="none">
                      <path d="M1 5l3.5 3.5L11 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : null}
                </button>
                <span
                  className={cn(
                    "min-w-0 flex-1 font-serif text-[14.5px]",
                    item.checked ? "text-foreground" : "text-muted-foreground line-through"
                  )}
                >
                  {item.title}
                </span>
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                  aria-label={`Remove ${item.title}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))
          )}
        </div>
        <div className="border-t border-border/70 px-[18px] py-3">
          {addTrigger}
        </div>
      </DialogContent>
    </Dialog>
  )
}

type AnnouncementsAndBusinessSectionProps = {
  announcements: PlannerItem[]
  business: PlannerItem[]
  onAnnouncementsChange: (items: PlannerItem[]) => void
  onBusinessChange: (items: PlannerItem[]) => void
}

function AnnouncementsAndBusinessSection({
  announcements,
  business,
  onAnnouncementsChange,
  onBusinessChange,
}: AnnouncementsAndBusinessSectionProps) {
  const [announcementsModalOpen, setAnnouncementsModalOpen] = useState(false)
  const [businessModalOpen, setBusinessModalOpen] = useState(false)

  return (
    <div>
      <SectionHeader label="Announcements & business" number="03" />
      <ItemsRow type="Announcements" items={announcements} onClick={() => setAnnouncementsModalOpen(true)} />
      <ItemsRow type="Business" items={business} onClick={() => setBusinessModalOpen(true)} />
      <ItemsPickerModal
        open={announcementsModalOpen}
        onOpenChange={setAnnouncementsModalOpen}
        title="Announcements"
        items={announcements}
        onChange={onAnnouncementsChange}
        addTrigger={
          <AnnouncementSelectorPopover
            onSelect={(selected) => {
              const newItems = selected
                .filter((a) => !announcements.some((item) => item.id === a.id))
                .map((a) => ({ id: a.id, title: a.title, checked: true }))
              if (newItems.length) onAnnouncementsChange([...announcements, ...newItems])
            }}
          >
            <Button type="button" variant="outline" size="sm" className="w-full">
              <Plus className="h-3.5 w-3.5" />
              Add announcements
            </Button>
          </AnnouncementSelectorPopover>
        }
      />
      <ItemsPickerModal
        open={businessModalOpen}
        onOpenChange={setBusinessModalOpen}
        title="Business"
        items={business}
        onChange={onBusinessChange}
        addTrigger={
          <BusinessSelectorPopover
            onSelect={(selected) => {
              const newItems = selected
                .filter((b) => !business.some((item) => item.id === b.id))
                .map((b) => ({
                  id: b.id,
                  title: `${b.person_name}${b.position_calling ? ` – ${b.position_calling}` : ""}`,
                  checked: true,
                }))
              if (newItems.length) onBusinessChange([...business, ...newItems])
            }}
          >
            <Button type="button" variant="outline" size="sm" className="w-full">
              <Plus className="h-3.5 w-3.5" />
              Add business items
            </Button>
          </BusinessSelectorPopover>
        }
      />
    </div>
  )
}

type ClosingSectionProps = {
  entries: AgendaEntry[]
  onPickHymn: (entryId: string) => void
  onPickPrayer: (entryId: string, field: AgendaAssigneeField) => void
}

function ClosingSection({ entries, onPickHymn, onPickPrayer }: ClosingSectionProps) {
  const closingHymn = getStaticEntry(entries, "closing-hymn")
  const benediction = getStaticEntry(entries, "benediction")

  return (
    <div>
      <SectionHeader label="Closing" number="06" />
      {closingHymn ? (
        <HymnPlanningRow
          type="Closing hymn"
          hymnNumber={closingHymn.hymnNumber}
          hymnTitle={closingHymn.hymnTitle}
          onClick={() => onPickHymn(closingHymn.id)}
        />
      ) : null}
      {benediction ? (
        <PrayerPlanningRow
          type="Benediction"
          personName={benediction.assigneeName}
          onClick={() => onPickPrayer(benediction.id, "benediction")}
        />
      ) : null}
    </div>
  )
}

type HymnPlanningRowProps = {
  type: string
  hymnNumber?: number
  hymnTitle?: string
  meta?: string
  onClick: () => void
}

function HymnPlanningRow({ type, hymnNumber, hymnTitle, meta, onClick }: HymnPlanningRowProps) {
  const hasHymn = Boolean(hymnTitle)

  return (
    <button
      className="mb-2 grid w-full grid-cols-[100px_1fr_auto] items-center gap-3.5 rounded-xl border border-border/70 bg-surface-raised px-3.5 py-3 text-left transition-colors hover:border-border hover:bg-surface-hover"
      onClick={onClick}
      type="button"
    >
      <div className="text-[10.5px] font-medium uppercase tracking-[0.05em] text-muted-foreground">
        {type}
      </div>
      <div className="min-w-0">
        {hasHymn ? (
          <>
            {typeof hymnNumber === "number" ? (
              <span className="mr-1.5 font-serif text-[13px] italic text-brand">
                № {hymnNumber}
              </span>
            ) : null}
            <span className="font-serif text-[15.5px] text-foreground">{hymnTitle}</span>
          </>
        ) : (
          <span className="font-serif text-[15.5px] italic text-muted-foreground">Choose a hymn</span>
        )}
        {hasHymn && meta ? (
          <div className="mt-px truncate text-[11.5px] text-muted-foreground">{meta}</div>
        ) : null}
      </div>
      <ChevronRightIcon />
    </button>
  )
}

type PrayerPlanningRowProps = {
  type: string
  personName?: string
  onClick: () => void
}

function PrayerPlanningRow({ type, personName, onClick }: PrayerPlanningRowProps) {
  const assignedName = personName?.trim()

  return (
    <button
      className="mb-2 grid w-full grid-cols-[100px_1fr_auto] items-center gap-3.5 rounded-xl border border-border/70 bg-surface-raised px-3.5 py-3 text-left transition-colors hover:border-border hover:bg-surface-hover"
      onClick={onClick}
      type="button"
    >
      <div className="text-[10.5px] font-medium uppercase tracking-[0.05em] text-muted-foreground">
        {type}
      </div>
      <div className="min-w-0">
        {assignedName ? (
          <span className="font-serif text-[15.5px] text-foreground">{assignedName}</span>
        ) : (
          <span className="font-serif text-[15.5px] italic text-muted-foreground">Assign someone</span>
        )}
      </div>
      <ChevronRightIcon />
    </button>
  )
}

type SacramentSectionProps = {
  entries: AgendaEntry[]
  assignments: PlannerMeetingState["sacramentAssignments"]
  onPickHymn: (entryId: string) => void
  onAssign: (role: SacramentAssignmentRole) => void
  onRemove: (role: SacramentAssignmentRole, name: string) => void
}

function SacramentSection({
  entries,
  assignments,
  onPickHymn,
  onAssign,
  onRemove,
}: SacramentSectionProps) {
  const sacramentHymn = getStaticEntry(entries, "sacrament-hymn")

  return (
    <div>
      <SectionHeader label="Sacrament" number="04" />
      {sacramentHymn ? (
        <HymnPlanningRow
          type="Sacrament hymn"
          hymnNumber={sacramentHymn.hymnNumber}
          hymnTitle={sacramentHymn.hymnTitle}
          onClick={() => onPickHymn(sacramentHymn.id)}
        />
      ) : null}
      <div className="mt-2 grid gap-2.5 sm:grid-cols-2">
        <AaronicAssignmentCard
          title="Blessing the sacrament"
          people={assignments.blessing}
          max={2}
          onAdd={() => onAssign("blessing")}
          onRemove={(name) => onRemove("blessing", name)}
        />
        <AaronicAssignmentCard
          title="Passing the sacrament"
          people={assignments.passing}
          max={8}
          onAdd={() => onAssign("passing")}
          onRemove={(name) => onRemove("passing", name)}
        />
      </div>
    </div>
  )
}

type AaronicAssignmentCardProps = {
  title: string
  people: string[]
  max: number
  onAdd: () => void
  onRemove: (name: string) => void
}

function AaronicAssignmentCard({ title, people, max, onAdd, onRemove }: AaronicAssignmentCardProps) {
  const assignedPeople = people.filter((person) => person.trim())

  return (
    <div className="rounded-xl border border-border/70 bg-surface-raised px-3.5 py-3">
      <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
        {title} <span className="text-muted-foreground/70">· {assignedPeople.length}/{max}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {assignedPeople.map((person) => (
          <span
            key={person}
            className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/50 py-1 pl-2.5 pr-1 text-[12.5px] font-serif text-foreground"
          >
            {person}
            <button
              type="button"
              className="grid h-4 w-4 place-items-center rounded-full bg-card text-[11px] text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => onRemove(person)}
              aria-label={`Remove ${person}`}
            >
              &times;
            </button>
          </span>
        ))}
        {assignedPeople.length < max ? (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border px-2.5 py-1 text-[12px] font-medium text-muted-foreground transition-colors hover:border-border hover:text-foreground"
            onClick={onAdd}
          >
            <Plus className="h-3 w-3" />
            Add
          </button>
        ) : null}
      </div>
    </div>
  )
}

type SpeakersAndMusicSectionProps = {
  entries: AgendaEntry[]
  isFastTestimony: boolean
  onSelectSpeaker: (entryId: string) => void
  onSpeakerFieldChange: (
    entryId: string,
    field: "topic" | "time",
    value: string | number | null
  ) => void
  onDeleteSpeaker: (entryId: string) => void
  onPickHymn: (entryId: string) => void
  onDeleteStaticEntry: (entryId: string) => void
  onAddSpeaker: () => void
  onAddIntermediateHymn: () => void
  onAddSpecialNumber: () => void
}

function SpeakersAndMusicSection({
  entries,
  isFastTestimony,
  onSelectSpeaker,
  onSpeakerFieldChange,
  onDeleteSpeaker,
  onPickHymn,
  onDeleteStaticEntry,
  onAddSpeaker,
  onAddIntermediateHymn,
  onAddSpecialNumber,
}: SpeakersAndMusicSectionProps) {
  const messageEntries = entries.filter(
    (entry): entry is SpeakerEntry | TestimonyEntry | StaticEntry =>
      entry.kind === "speaker" ||
      entry.kind === "testimony" ||
      (entry.kind === "static" && Boolean(entry.removable))
  )
  let speakerOrder = 0

  return (
    <div>
      <SectionHeader label={isFastTestimony ? "Testimony meeting" : "Speakers & music"} number="05" />
      {isFastTestimony ? (
        <div className="rounded-xl border border-border/70 bg-card px-4 py-4 font-serif text-[14.5px] italic leading-6 text-muted-foreground">
          Fast &amp; testimony meeting - open to the congregation following the presiding authority&apos;s opening testimony.
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {messageEntries.map((entry) => {
              if (entry.kind === "speaker") {
                speakerOrder += 1
                return (
                  <SpeakerPlanningRow
                    key={entry.id}
                    entry={entry}
                    order={speakerOrder}
                    onSelectSpeaker={onSelectSpeaker}
                    onSpeakerFieldChange={onSpeakerFieldChange}
                    onDeleteSpeaker={onDeleteSpeaker}
                  />
                )
              }

              if (entry.kind === "static") {
                return (
                  <MusicPlanningRow
                    key={entry.id}
                    entry={entry}
                    onPickHymn={onPickHymn}
                    onDeleteStaticEntry={onDeleteStaticEntry}
                  />
                )
              }

              return null
            })}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onAddSpeaker}
              className="inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            >
              <Plus className="h-4 w-4" />
              Add speaker
            </button>
            <button
              type="button"
              onClick={onAddIntermediateHymn}
              className="inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            >
              <Plus className="h-4 w-4" />
              Add Intermediate Hymn
            </button>
            <button
              type="button"
              onClick={onAddSpecialNumber}
              className="inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            >
              <Plus className="h-4 w-4" />
              Add musical number
            </button>
          </div>
        </>
      )}
    </div>
  )
}

type SpeakerPlanningRowProps = {
  entry: SpeakerEntry
  order: number
  onSelectSpeaker: (entryId: string) => void
  onSpeakerFieldChange: (
    entryId: string,
    field: "topic" | "time",
    value: string | number | null
  ) => void
  onDeleteSpeaker: (entryId: string) => void
}

function SpeakerPlanningRow({
  entry,
  order,
  onSelectSpeaker,
  onSpeakerFieldChange,
  onDeleteSpeaker,
}: SpeakerPlanningRowProps) {
  return (
    <div className="grid grid-cols-[30px_1fr_auto] items-center gap-3 rounded-xl border border-border/70 bg-surface-raised px-3.5 py-3">
      <div className="font-mono text-[12px] text-muted-foreground">{order}.</div>
      <div className="min-w-0">
        <button
          type="button"
          onClick={() => onSelectSpeaker(entry.id)}
          className="block w-full truncate text-left font-serif text-[16.5px] text-foreground"
        >
          {entry.speakerName ? (
            entry.speakerName
          ) : (
            <span className="italic text-muted-foreground">Tap to assign speaker</span>
          )}
        </button>
        <input
          value={entry.topic}
          onChange={(event) => onSpeakerFieldChange(entry.id, "topic", event.target.value)}
          placeholder="Topic or assigned subject"
          className="mt-0.5 w-full border-0 bg-transparent p-0 text-[13px] text-muted-foreground outline-none placeholder:text-muted-foreground"
        />
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min={1}
            max={60}
            value={entry.durationMinutes ?? ""}
            onChange={(e) => onSpeakerFieldChange(entry.id, "time", e.target.value ? Number(e.target.value) : null)}
            placeholder="—"
            className="w-[46px] rounded-md border border-border/70 bg-surface-sunken px-1.5 py-1 text-right font-mono text-[12px] text-foreground outline-none focus:border-border"
          />
          <span className="font-mono text-[11.5px] text-muted-foreground">min</span>
        </div>
        <button
          type="button"
          onClick={() => onDeleteSpeaker(entry.id)}
          className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
          aria-label={`Remove ${entry.title}`}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

type MusicPlanningRowProps = {
  entry: StaticEntry
  onPickHymn: (entryId: string) => void
  onDeleteStaticEntry: (entryId: string) => void
}

function MusicPlanningRow({ entry, onPickHymn, onDeleteStaticEntry }: MusicPlanningRowProps) {
  const hasHymn = Boolean(entry.hymnTitle)

  return (
    <div className="mb-2 grid w-full grid-cols-[100px_1fr_auto] items-center gap-3.5 rounded-xl border border-border/70 bg-surface-raised px-3.5 py-3">
      <div className="text-[10.5px] font-medium uppercase tracking-[0.05em] text-muted-foreground">
        {entry.title}
      </div>
      <button
        type="button"
        onClick={() => onPickHymn(entry.id)}
        className="min-w-0 text-left transition-colors hover:text-foreground"
      >
        {hasHymn ? (
          <>
            {typeof entry.hymnNumber === "number" ? (
              <span className="mr-1.5 font-serif text-[13px] italic text-brand">
                № {entry.hymnNumber}
              </span>
            ) : null}
            <span className="font-serif text-[15.5px] text-foreground">{entry.hymnTitle}</span>
          </>
        ) : (
          <span className="font-serif text-[15.5px] italic text-muted-foreground">Choose a hymn</span>
        )}
      </button>
      <button
        type="button"
        onClick={() => onDeleteStaticEntry(entry.id)}
        className="grid h-6 w-6 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
        aria-label={`Remove ${entry.title}`}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}

type UpcomingPanelProps = {
  sundays: PlannerSunday[]
  meetingsByDate: Record<string, PlannerMeetingState>
  selectedIsoDate: string
  defaultLanguage: Lang
  jumpDate: Date | undefined
  jumpPopoverOpen: boolean
  visibleSundayCount: number
  sundayCount: number
  onSelectSunday: (isoDate: string) => void
  onJumpPopoverOpenChange: (open: boolean) => void
  onJumpDateSelect: (date: Date | undefined) => void
  onShowMore: () => void
}

function UpcomingPanel({
  sundays,
  meetingsByDate,
  selectedIsoDate,
  defaultLanguage,
  jumpDate,
  jumpPopoverOpen,
  visibleSundayCount,
  sundayCount,
  onSelectSunday,
  onJumpPopoverOpenChange,
  onJumpDateSelect,
  onShowMore,
}: UpcomingPanelProps) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-2 dark:bg-background xl:sticky xl:top-6">
      <div className="flex items-center gap-2 px-2.5 pb-2 pt-2">
        <div className="font-serif text-[14px] text-foreground">Upcoming</div>
        <div className="ml-auto text-[11.5px] text-muted-foreground">{sundayCount} meetings</div>
      </div>

      <div className="flex flex-col">
        {sundays.map((sunday) => {
          const meeting =
            meetingsByDate[sunday.isoDate] ??
            createInitialMeetingState(sunday.isoDate, defaultLanguage)
          const dateParts = getUpcomingDateParts(sunday.isoDate)
          const isSelected = sunday.isoDate === selectedIsoDate
          const title = getMeetingListTitle(meeting)
          const kind = getUpcomingMeetingKind(meeting)
          const conductor = meeting.assignments.conductor.trim()

          return (
            <button
              key={sunday.isoDate}
              type="button"
              onClick={() => onSelectSunday(sunday.isoDate)}
              className={cn(
                "grid grid-cols-[48px_1fr] items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors duration-100",
                isSelected ? "bg-surface-active" : "hover:bg-surface-hover"
              )}
            >
              <div
                className={cn(
                  "rounded-lg border border-border/70 py-1 text-center",
                  isSelected ? "bg-background" : "bg-surface-sunken"
                )}
              >
                <div className="text-[9.5px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  {dateParts.month}
                </div>
                <div className="mt-0.5 font-serif text-[17px] leading-none text-foreground">
                  {dateParts.day}
                </div>
              </div>

              <div className="min-w-0">
                <div className="truncate text-[13px] text-foreground">
                  {title ? title : <span className="font-serif italic text-muted-foreground">Untitled</span>}
                </div>
                <div className="mt-1 flex min-w-0 items-center gap-1.5 text-[11.5px] text-muted-foreground">
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-[1px] text-[10px] font-medium uppercase tracking-[0.04em]",
                      kind.className
                    )}
                  >
                    {kind.label}
                  </span>
                  {conductor ? <span className="truncate">· {conductor}</span> : null}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <div className="px-2 pb-2 pt-1">
        <Popover open={jumpPopoverOpen} onOpenChange={onJumpPopoverOpenChange}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start gap-2">
              <CalendarDays className="h-4 w-4" />
              Jump to date
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={jumpDate}
              onSelect={onJumpDateSelect}
              disabled={(date) => isBefore(startOfDay(date), startOfDay(new Date()))}
            />
          </PopoverContent>
        </Popover>
        {visibleSundayCount < sundayCount ? (
          <Button
            variant="ghost"
            className="mt-2 w-full justify-center"
            onClick={onShowMore}
          >
            Show more Sundays
          </Button>
        ) : null}
      </div>
    </div>
  )
}

export function SacramentMeetingPlannerClient({
  defaultLanguage = "ENG",
  unitName,
}: {
  defaultLanguage?: Lang
  unitName: string
}) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [sundays, setSundays] = useState<PlannerSunday[]>(() => getUpcomingSundays())
  const defaultLanguageRef = useRef(defaultLanguage)
  const [directoryPeople, setDirectoryPeople] = useState<DirectoryPerson[]>([])
  const [isDirectoryLoading, setIsDirectoryLoading] = useState(false)
  const [directoryModalOpen, setDirectoryModalOpen] = useState(false)
  const [directoryTarget, setDirectoryTarget] = useState<DirectoryTarget | null>(null)
  const [hymnModalOpen, setHymnModalOpen] = useState(false)
  const [hymnTarget, setHymnTarget] = useState<HymnTarget | null>(null)
  const [activeTab, setActiveTab] = useState<PlannerTab>("meeting")
  const [jumpDate, setJumpDate] = useState<Date | undefined>(undefined)
  const [jumpPopoverOpen, setJumpPopoverOpen] = useState(false)
  const [visibleSundayCount, setVisibleSundayCount] = useState(DEFAULT_VISIBLE_SUNDAYS)
  const [clearDialogOpen, setClearDialogOpen] = useState(false)
  const [audienceOpen, setAudienceOpen] = useState(false)
  const [conductOpen, setConductOpen] = useState(false)
  const [notesByDate, setNotesByDate] = useState<Record<string, PlannerNotes>>({})
  const [meetingTypeOverridesByDate, setMeetingTypeOverridesByDate] = useState<Record<string, boolean>>({})
  const [meetingsByDate, setMeetingsByDate] = useState<Record<string, PlannerMeetingState>>(() =>
    Object.fromEntries(
      sundays.map((sunday) => [sunday.isoDate, createInitialMeetingState(sunday.isoDate, defaultLanguage)])
    )
  )
  const [autosaveStatus, setAutosaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasLoadedDraftRef = useRef(false)

  const selectedSunday = useMemo(() => {
    const selectedDate = searchParams.get("date")
    return sundays.find((sunday) => sunday.isoDate === selectedDate) ?? sundays[0]
  }, [searchParams, sundays])

  const selectedMeeting =
    meetingsByDate[selectedSunday.isoDate] ??
    createInitialMeetingState(selectedSunday.isoDate, defaultLanguageRef.current)
  const visibleEntries = getVisibleAgendaEntries(selectedMeeting)
  const selectedMeetingTitlePlaceholder = getDefaultMeetingTitle(selectedMeeting.specialType)
  const selectedMeetingStats = getPlannerAssignmentStats(selectedMeeting)
  const selectedPlannerStatus = getDerivedPlannerStatus(selectedSunday.isoDate, selectedMeeting)
  const visibleSundays = sundays.slice(0, visibleSundayCount)
  const selectedNotes = notesByDate[selectedSunday.isoDate] ?? { announcements: [], business: [], notes: "" }
  const remainingAgendaEntries = visibleEntries.filter(
    (entry) =>
      ![
        "section-opening",
        "opening-hymn",
        "invocation",
        "ward-business",
        "section-ordinance",
        "sacrament-hymn",
        "sacrament-ordinance",
        "section-messages",
        SECTION_CLOSING_ID,
        "closing-hymn",
        "benediction",
      ].includes(entry.id) &&
      entry.kind !== "speaker" &&
      entry.kind !== "testimony" &&
      !(entry.kind === "static" && entry.removable)
  )

  const breadcrumbItems = useMemo(
    () => [
      { label: "Meetings", href: "/meetings/overview" },
      { label: "Sacrament Meeting", href: "/meetings/sacrament-meeting/program-planner" },
      { label: "Program Planner", href: "/meetings/sacrament-meeting/program-planner" },
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

  useEffect(() => {
    if (!directoryModalOpen || directoryPeople.length > 0) {
      return
    }

    let isMounted = true

    const loadDirectoryPeople = async () => {
      setIsDirectoryLoading(true)
      const supabase = createClient()
      const { data, error } = await supabase
        .from("directory")
        .select("id, name")
        .order("name", { ascending: true })

      if (!isMounted) {
        return
      }

      if (error) {
        console.error("Failed to load directory people:", error)
      } else {
        setDirectoryPeople((data ?? []) as DirectoryPerson[])
      }

      setIsDirectoryLoading(false)
    }

    void loadDirectoryPeople()

    return () => {
      isMounted = false
    }
  }, [directoryModalOpen, directoryPeople.length])

  // Auto-populate announcements & business items on first visit to a date
  useEffect(() => {
    const currentNotes = notesByDate[selectedSunday.isoDate]
    if (currentNotes?.initialized) return

    let isMounted = true

    const initNotesForDate = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !isMounted) return

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profile } = await (supabase.from("profiles") as any)
        .select("workspace_id")
        .eq("id", user.id)
        .single()

      const workspaceId = profile?.workspace_id
      if (!workspaceId || !isMounted) return

      const [annResult, bizResult] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from("announcements") as any)
          .select("id, title")
          .eq("status", "active")
          .eq("workspace_id", workspaceId)
          .order("priority", { ascending: true })
          .order("created_at", { ascending: false }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from("business_items") as any)
          .select("id, person_name, position_calling")
          .eq("status", "pending")
          .eq("workspace_id", workspaceId)
          .order("created_at", { ascending: false }),
      ])

      if (!isMounted) return

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const announcements: PlannerItem[] = (annResult.data ?? []).map((a: any) => ({
        id: a.id,
        title: a.title,
        checked: true,
      }))

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const business: PlannerItem[] = (bizResult.data ?? []).map((b: any) => ({
        id: b.id,
        title: `${b.person_name}${b.position_calling ? ` – ${b.position_calling}` : ""}`,
        checked: true,
      }))

      setNotesByDate((prev) => ({
        ...prev,
        [selectedSunday.isoDate]: {
          ...(prev[selectedSunday.isoDate] ?? { notes: "" }),
          announcements,
          business,
          initialized: true,
        },
      }))
    }

    void initNotesForDate()

    return () => {
      isMounted = false
    }
  // Only re-run when the selected date changes; notesByDate intentionally omitted
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSunday.isoDate])

  useEffect(() => {
    setMeetingsByDate((prev) => {
      let hasChanges = false
      const next = { ...prev }

      for (const sunday of sundays) {
        if (next[sunday.isoDate]) {
          continue
        }

        next[sunday.isoDate] = createInitialMeetingState(sunday.isoDate, defaultLanguageRef.current)
        hasChanges = true
      }

      return hasChanges ? next : prev
    })
  }, [sundays])

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PLANNER_DRAFT_STORAGE_KEY)
      if (!raw) {
        hasLoadedDraftRef.current = true
        return
      }

      const parsed = JSON.parse(raw) as {
        meetingsByDate?: Record<string, Partial<PlannerMeetingState>>
        notesByDate?: Record<string, PlannerNotes>
        meetingTypeOverridesByDate?: Record<string, boolean>
        savedAt?: string
      }

      const meetingTypeOverrides = parsed.meetingTypeOverridesByDate ?? {}

      if (parsed.meetingsByDate) {
        setMeetingsByDate((prev) => {
          const next = { ...prev }

          for (const sunday of sundays) {
            const savedMeeting = parsed.meetingsByDate?.[sunday.isoDate]
            if (!savedMeeting) continue

            next[sunday.isoDate] = {
              ...prev[sunday.isoDate],
              ...savedMeeting,
              specialType:
                meetingTypeOverrides[sunday.isoDate] || savedMeeting.specialType !== "standard"
                  ? savedMeeting.specialType ?? prev[sunday.isoDate].specialType
                  : getDefaultMeetingSpecialType(sunday.isoDate),
              assignments: {
                ...prev[sunday.isoDate].assignments,
                ...(savedMeeting.assignments ?? {}),
              },
              sacramentAssignments: {
                ...prev[sunday.isoDate].sacramentAssignments,
                ...(savedMeeting.sacramentAssignments ?? {}),
              },
              standardEntries: Array.isArray(savedMeeting.standardEntries)
                ? translateEntries(savedMeeting.standardEntries as AgendaEntry[], defaultLanguageRef.current)
                : prev[sunday.isoDate].standardEntries,
              fastEntries: Array.isArray(savedMeeting.fastEntries)
                ? translateEntries(savedMeeting.fastEntries as AgendaEntry[], defaultLanguageRef.current)
                : prev[sunday.isoDate].fastEntries,
            }
          }

          return next
        })
      }

      if (parsed.notesByDate) {
        // Migrate old string format to new PlannerItem[] format
        // Mark all saved dates as initialized — user previously managed that data
        const migratedNotes: Record<string, PlannerNotes> = {}
        for (const [date, savedNotes] of Object.entries(parsed.notesByDate)) {
          migratedNotes[date] = {
            announcements: Array.isArray(savedNotes.announcements) ? savedNotes.announcements : [],
            business: Array.isArray((savedNotes as unknown as Record<string, unknown>).business)
              ? ((savedNotes as unknown as Record<string, unknown>).business as PlannerItem[])
              : [],
            notes: savedNotes.notes,
            initialized: true,
          }
        }
        setNotesByDate(migratedNotes)
      }

      if (parsed.meetingTypeOverridesByDate) {
        setMeetingTypeOverridesByDate(parsed.meetingTypeOverridesByDate)
      }

      if (parsed.savedAt) {
        setLastSavedAt(new Date(parsed.savedAt))
        setAutosaveStatus("saved")
      }
    } catch (error) {
      console.error("Failed to load planner draft:", error)
      setAutosaveStatus("error")
    } finally {
      hasLoadedDraftRef.current = true
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sundays])

  useEffect(() => {
    if (!hasLoadedDraftRef.current) {
      return
    }

    const saveDraft = () => {
      try {
        setAutosaveStatus("saving")
        const payload = {
          meetingsByDate,
          notesByDate,
          meetingTypeOverridesByDate,
          savedAt: new Date().toISOString(),
        }
        window.localStorage.setItem(PLANNER_DRAFT_STORAGE_KEY, JSON.stringify(payload))
        setLastSavedAt(new Date())
        setAutosaveStatus("saved")
      } catch (error) {
        console.error("Failed to save planner draft:", error)
        setAutosaveStatus("error")
      }
    }

    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current)
    }

    setAutosaveStatus("idle")
    autosaveTimeoutRef.current = setTimeout(saveDraft, AUTOSAVE_DELAY_MS)

    const flushDraft = () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current)
        autosaveTimeoutRef.current = null
      }
      saveDraft()
    }

    const flushOnHide = () => { if (document.visibilityState === "hidden") flushDraft() }

    window.addEventListener("pagehide", flushDraft)
    window.addEventListener("beforeunload", flushDraft)
    document.addEventListener("visibilitychange", flushOnHide)

    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current)
        autosaveTimeoutRef.current = null
      }
      window.removeEventListener("pagehide", flushDraft)
      window.removeEventListener("beforeunload", flushDraft)
      document.removeEventListener("visibilitychange", flushOnHide)
    }
  }, [meetingsByDate, meetingTypeOverridesByDate, notesByDate])

  useEffect(() => {
    const selectedDate = searchParams.get("date")
    if (!selectedDate) {
      return
    }

    const selectedIndex = sundays.findIndex((sunday) => sunday.isoDate === selectedDate)
    if (selectedIndex === -1) {
      return
    }

    setVisibleSundayCount((prev) => Math.max(prev, selectedIndex + 1))
  }, [searchParams, sundays])

  const handleSelectSunday = (isoDate: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("date", isoDate)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const upsertSunday = (date: Date) => {
    const sundayDate = getSundayOnOrAfter(date)
    const sunday = toPlannerSunday(sundayDate)

    setSundays((prev) => {
      if (prev.some((entry) => entry.isoDate === sunday.isoDate)) {
        return prev
      }

      return [...prev, sunday].sort((left, right) => left.isoDate.localeCompare(right.isoDate))
    })

    handleSelectSunday(sunday.isoDate)
    return sunday
  }

  const handleJumpDateSelect = (date: Date | undefined) => {
    setJumpDate(date)
    if (!date) {
      return
    }

    upsertSunday(date)
    setJumpPopoverOpen(false)
  }

  const updateSelectedMeeting = (updater: (meeting: PlannerMeetingState) => PlannerMeetingState) => {
    setMeetingsByDate((prev) => ({
      ...prev,
      [selectedSunday.isoDate]: updater(prev[selectedSunday.isoDate]),
    }))
  }

  const handleMeetingTypeChange = (nextType: MeetingSpecialType) => {
    setMeetingTypeOverridesByDate((prev) => ({
      ...prev,
      [selectedSunday.isoDate]: nextType !== getDefaultMeetingSpecialType(selectedSunday.isoDate),
    }))
    updateSelectedMeeting((meeting) => ({
      ...meeting,
      specialType: nextType,
    }))
  }

  const handleMeetingTitleChange = (title: string) => {
    updateSelectedMeeting((meeting) => ({
      ...meeting,
      title,
    }))
  }

  const handleClearSelectedSunday = () => {
    setMeetingsByDate((prev) => ({
      ...prev,
      [selectedSunday.isoDate]: createInitialMeetingState(selectedSunday.isoDate, defaultLanguageRef.current),
    }))
    setNotesByDate((prev) => ({
      ...prev,
      [selectedSunday.isoDate]: { announcements: [], business: [], notes: "", initialized: false },
    }))
    setMeetingTypeOverridesByDate((prev) => ({
      ...prev,
      [selectedSunday.isoDate]: false,
    }))
    setClearDialogOpen(false)
  }

  const handleAnnouncementsChange = (items: PlannerItem[]) => {
    setNotesByDate((prev) => ({
      ...prev,
      [selectedSunday.isoDate]: {
        ...(prev[selectedSunday.isoDate] ?? { announcements: [], business: [], notes: "" }),
        announcements: items,
      },
    }))
  }

  const handleBusinessChange = (items: PlannerItem[]) => {
    setNotesByDate((prev) => ({
      ...prev,
      [selectedSunday.isoDate]: {
        ...(prev[selectedSunday.isoDate] ?? { announcements: [], business: [], notes: "" }),
        business: items,
      },
    }))
  }

  const handleNotesTextChange = (value: string) => {
    setNotesByDate((prev) => ({
      ...prev,
      [selectedSunday.isoDate]: {
        ...(prev[selectedSunday.isoDate] ?? { announcements: [], business: [], notes: "" }),
        notes: value,
      },
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

  const handleAddSacramentAssignment = (role: SacramentAssignmentRole, personName: string) => {
    const maxByRole: Record<SacramentAssignmentRole, number> = {
      blessing: 2,
      passing: 8,
    }

    updateSelectedMeeting((meeting) => {
      const currentPeople = meeting.sacramentAssignments[role] ?? []
      const trimmedName = personName.trim()

      if (!trimmedName || currentPeople.includes(trimmedName) || currentPeople.length >= maxByRole[role]) {
        return meeting
      }

      return {
        ...meeting,
        sacramentAssignments: {
          ...meeting.sacramentAssignments,
          [role]: [...currentPeople, trimmedName],
        },
      }
    })
  }

  const handleRemoveSacramentAssignment = (role: SacramentAssignmentRole, personName: string) => {
    updateSelectedMeeting((meeting) => ({
      ...meeting,
      sacramentAssignments: {
        ...meeting.sacramentAssignments,
        [role]: (meeting.sacramentAssignments[role] ?? []).filter((name) => name !== personName),
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

  const handleSpeakerFieldChange = (
    entryId: string,
    field: "topic" | "time",
    value: string | number | null
  ) => {
    updateSelectedMeeting((meeting) => ({
      ...meeting,
      standardEntries: meeting.standardEntries.map((entry) =>
        entry.id === entryId && entry.kind === "speaker"
          ? {
              ...entry,
              ...(field === "time"
                ? { durationMinutes: typeof value === "number" ? value : null }
                : { topic: typeof value === "string" ? value : "" }),
            }
          : entry
      ),
    }))
  }

  const handleDeleteSpeaker = (entryId: string) => {
    updateSelectedMeeting((meeting) => ({
      ...meeting,
      standardEntries: meeting.standardEntries.filter(
        (entry) => !(entry.id === entryId && entry.kind === "speaker")
      ),
    }))
  }

  const handleDeleteStaticEntry = (entryId: string) => {
    updateSelectedMeeting((meeting) => ({
      ...meeting,
      standardEntries: meeting.standardEntries.filter(
        (entry) => !(entry.id === entryId && entry.kind === "static")
      ),
    }))
  }

  const handleAgendaAssigneeChange = (
    entryId: string,
    field: AgendaAssigneeField,
    assigneeName: string
  ) => {
    updateSelectedMeeting((meeting) => {
      const mapEntries = (entries: AgendaEntry[]) =>
        entries.map((entry) =>
          entry.id === entryId &&
          entry.kind === "static" &&
          entry.assigneeField === field
            ? { ...entry, assigneeName }
            : entry
        )

      return {
        ...meeting,
        standardEntries: mapEntries(meeting.standardEntries),
        fastEntries: mapEntries(meeting.fastEntries),
      }
    })
  }

  const handleHymnChange = (
    entryId: string,
    hymn: { id: string; number: number; title: string }
  ) => {
    updateSelectedMeeting((meeting) => {
      const mapEntries = (entries: AgendaEntry[]) =>
        entries.map((entry) =>
          entry.id === entryId && entry.kind === "static"
            ? {
                ...entry,
                hymnId: hymn.id,
                hymnNumber: hymn.number,
                hymnTitle: hymn.title,
              }
            : entry
        )

      return {
        ...meeting,
        standardEntries: mapEntries(meeting.standardEntries),
        fastEntries: mapEntries(meeting.fastEntries),
      }
    })
  }

  const handleAddSpeaker = () => {
    updateSelectedMeeting((meeting) => {
      const nextSpeakerId = `${selectedSunday.isoDate}-speaker-${Date.now()}`
      const nextSpeaker: SpeakerEntry = {
        id: nextSpeakerId,
        kind: "speaker",
        title: SPEAKER_LABEL[defaultLanguage],
        speakerName: "",
        topic: "",
        durationMinutes: null,
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

  const handleAddIntermediateHymn = () => {
    updateSelectedMeeting((meeting) => {
      const nextHymnId = `${selectedSunday.isoDate}-hymn-${Date.now()}`
      const nextHymn: StaticEntry = {
        id: nextHymnId,
        kind: "static",
        title: INTERMEDIATE_HYMN_LABEL[defaultLanguage],
        hymnId: "",
        hymnTitle: "",
        removable: true,
      }
      const closingIndex = meeting.standardEntries.findIndex((entry) => entry.id === SECTION_CLOSING_ID)
      const insertAt = closingIndex === -1 ? meeting.standardEntries.length : closingIndex
      const nextEntries = [...meeting.standardEntries]
      nextEntries.splice(insertAt, 0, nextHymn)

      return {
        ...meeting,
        standardEntries: nextEntries,
      }
    })
  }

  const handleAddSpecialNumber = () => {
    updateSelectedMeeting((meeting) => {
      const nextSpecialNumberId = `${selectedSunday.isoDate}-special-number-${Date.now()}`
      const nextSpecialNumber: StaticEntry = {
        id: nextSpecialNumberId,
        kind: "static",
        title: SPECIAL_NUMBER_LABEL[defaultLanguage],
        hymnId: "",
        hymnTitle: "",
        removable: true,
      }
      const closingIndex = meeting.standardEntries.findIndex((entry) => entry.id === SECTION_CLOSING_ID)
      const insertAt = closingIndex === -1 ? meeting.standardEntries.length : closingIndex
      const nextEntries = [...meeting.standardEntries]
      nextEntries.splice(insertAt, 0, nextSpecialNumber)

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

  const handleOpenDirectoryPicker = (target: DirectoryTarget) => {
    setDirectoryTarget(target)
    setDirectoryModalOpen(true)
  }

  const handleSelectDirectoryPerson = (personName: string) => {
    if (!directoryTarget) {
      return
    }

    if (directoryTarget.type === "assignment") {
      handleAssignmentChange(directoryTarget.field, personName)
    } else if (directoryTarget.type === "sacrament-assignment") {
      handleAddSacramentAssignment(directoryTarget.role, personName)
    } else if (directoryTarget.type === "speaker") {
      handleSpeakerNameChange(directoryTarget.entryId, personName)
    } else {
      handleAgendaAssigneeChange(directoryTarget.entryId, directoryTarget.field, personName)
    }

    setDirectoryModalOpen(false)
    setDirectoryTarget(null)
  }

  const handleOpenHymnPicker = (entryId: string) => {
    setHymnTarget({ entryId })
    setHymnModalOpen(true)
  }

  const handleSelectHymn = (hymn: { id: string; number: number; title: string }) => {
    if (!hymnTarget) {
      return
    }

    handleHymnChange(hymnTarget.entryId, hymn)
    setHymnModalOpen(false)
    setHymnTarget(null)
  }

  const autosaveLabel =
    autosaveStatus === "saving"
      ? "Saving draft..."
      : autosaveStatus === "error"
        ? "Autosave failed"
        : lastSavedAt
          ? `Saved ${format(lastSavedAt, "h:mm a")}`
          : "Draft autosaves"

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.code === "KeyA") {
        e.preventDefault()
        setAudienceOpen(true)
      }
      if (e.altKey && e.code === "KeyC") {
        e.preventDefault()
        setConductOpen(true)
      }
      if (e.altKey && e.code === "KeyS") {
        e.preventDefault()
        router.push("/meetings/sacrament-meeting/speaker-planner")
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [router])

  return (
    <div className="min-h-full dark:bg-card">
      <Breadcrumbs
        items={breadcrumbItems}
        action={
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => router.push("/meetings/sacrament-meeting/speaker-planner")}>
              <UserCheck className="h-3.5 w-3.5" />
              Speakers
              <kbd className="ml-1 hidden rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">⌥S</kbd>
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setAudienceOpen(true)}>
              <Eye className="h-3.5 w-3.5" />
              Audience
              <kbd className="ml-1 hidden rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">⌥A</kbd>
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setConductOpen(true)}>
              <Play className="h-3.5 w-3.5" />
              Conduct
              <kbd className="ml-1 hidden rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">⌥C</kbd>
            </Button>
          </div>
        }
      />
      <div className="mx-auto flex w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-2xl border border-transparent bg-card">
          <div className="sticky top-0 z-10 border-b border-border/60 bg-card px-6 py-5">
                <div className="flex flex-col gap-0">
                  <div>
                    <div className="text-[13px] text-muted-foreground">
                      {format(plannerSundayDateFromIso(selectedSunday.isoDate), "EEEE, MMMM d, yyyy")} · 9:00 AM
                    </div>
                    <EditableMeetingTitle
                      value={selectedMeeting.title}
                      placeholder={selectedMeetingTitlePlaceholder}
                      onChange={handleMeetingTitleChange}
                    />
                  </div>

                  <div className="-mt-0.5 flex flex-wrap items-end justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <MeetingTypeSelect
                        value={selectedMeeting.specialType}
                        onChange={handleMeetingTypeChange}
                      />
                      <PlannerStatusBadge status={selectedPlannerStatus} />
                      <div className="text-xs text-muted-foreground">
                        {autosaveLabel}
                      </div>
                      <div className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
                        {selectedMeetingStats.totalCount > 0 &&
                        selectedMeetingStats.assignedCount === selectedMeetingStats.totalCount ? (
                          <CircleCheck className="h-3.5 w-3.5 text-emerald-600" />
                        ) : null}
                        <span>
                          {selectedMeetingStats.assignedCount}/{selectedMeetingStats.totalCount} assigned
                          {selectedMeetingStats.optionalAssignedCount > 0
                            ? ` · ${selectedMeetingStats.optionalAssignedCount} optional`
                            : null}
                        </span>
                      </div>
                    </div>
                    <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                            aria-label="Meeting actions"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem
                            onSelect={(event) => {
                              event.preventDefault()
                              setClearDialogOpen(true)
                            }}
                            className="gap-2"
                          >
                            <Shredder className="h-4 w-4" />
                            Clear meeting data
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Clear this meeting&apos;s data?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will remove assignments, hymns, speakers, notes, and other planning details for{" "}
                            {format(plannerSundayDateFromIso(selectedSunday.isoDate), "MMMM d, yyyy")}. The meeting
                            type will return to the default for that Sunday.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleClearSelectedSunday}>
                            Clear meeting data
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>

              <PlannerTabs activeTab={activeTab} onTabChange={setActiveTab} />

              {activeTab === "meeting" ? (
                <div className="grid items-start gap-9 xl:grid-cols-[1fr_320px]">
                  <div>
                  <div className="border-b border-border/60 px-6 py-5">
                    <div className="flex flex-col gap-5">
                      <PresidencyAndMusicSection
                        assignments={selectedMeeting.assignments}
                        onSelect={(field) =>
                          handleOpenDirectoryPicker({
                            type: "assignment",
                            field,
                          })
                        }
                      />
                      <OpeningSection
                        entries={visibleEntries}
                        onPickHymn={handleOpenHymnPicker}
                        onPickPrayer={(entryId, field) =>
                          handleOpenDirectoryPicker({
                            type: "agenda-assignee",
                            entryId,
                            field,
                          })
                        }
                      />
                      <AnnouncementsAndBusinessSection
                        announcements={selectedNotes.announcements}
                        business={selectedNotes.business}
                        onAnnouncementsChange={handleAnnouncementsChange}
                        onBusinessChange={handleBusinessChange}
                      />
                      <SacramentSection
                        entries={visibleEntries}
                        assignments={selectedMeeting.sacramentAssignments}
                        onPickHymn={handleOpenHymnPicker}
                        onAssign={(role) =>
                          handleOpenDirectoryPicker({
                            type: "sacrament-assignment",
                            role,
                          })
                        }
                        onRemove={handleRemoveSacramentAssignment}
                      />
                      <SpeakersAndMusicSection
                        entries={visibleEntries}
                        isFastTestimony={selectedMeeting.specialType === "fast-testimony"}
                        onSelectSpeaker={(entryId) =>
                          handleOpenDirectoryPicker({
                            type: "speaker",
                            entryId,
                          })
                        }
                        onSpeakerFieldChange={handleSpeakerFieldChange}
                        onDeleteSpeaker={handleDeleteSpeaker}
                        onPickHymn={handleOpenHymnPicker}
                        onDeleteStaticEntry={handleDeleteStaticEntry}
                        onAddSpeaker={handleAddSpeaker}
                        onAddIntermediateHymn={handleAddIntermediateHymn}
                        onAddSpecialNumber={handleAddSpecialNumber}
                      />
                      <ClosingSection
                        entries={visibleEntries}
                        onPickHymn={handleOpenHymnPicker}
                        onPickPrayer={(entryId, field) =>
                          handleOpenDirectoryPicker({
                            type: "agenda-assignee",
                            entryId,
                            field,
                          })
                        }
                      />
                    </div>
                  </div>

                  {remainingAgendaEntries.length > 0 ? (
                    <div className="px-6 py-5">
                      <div className="mx-auto w-full max-w-3xl">
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={handleDragEnd}
                        >
                          <SortableContext
                            items={remainingAgendaEntries.map((entry) => entry.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            <div className="space-y-1.5">
                              {remainingAgendaEntries.map((entry) => (
                                <div key={entry.id}>
                                  <AgendaRow
                                    entry={entry}
                                    onSelectSpeaker={(entryId) =>
                                      handleOpenDirectoryPicker({
                                        type: "speaker",
                                        entryId,
                                      })
                                    }
                                    onSpeakerFieldChange={handleSpeakerFieldChange}
                                    onDeleteSpeaker={handleDeleteSpeaker}
                                    onDeleteStaticEntry={handleDeleteStaticEntry}
                                    onSelectAgendaAssignee={(entryId, field) =>
                                      handleOpenDirectoryPicker({
                                        type: "agenda-assignee",
                                        entryId,
                                        field,
                                      })
                                    }
                                    onSelectHymn={handleOpenHymnPicker}
                                  />
                                </div>
                              ))}
                            </div>
                          </SortableContext>
                        </DndContext>
                      </div>
                    </div>
                  ) : null}
                  </div>
                  <div className="pr-6 pt-5 xl:sticky xl:top-24">
                    <UpcomingPanel
                      sundays={visibleSundays}
                      meetingsByDate={meetingsByDate}
                      selectedIsoDate={selectedSunday.isoDate}
                      defaultLanguage={defaultLanguageRef.current}
                      jumpDate={jumpDate}
                      jumpPopoverOpen={jumpPopoverOpen}
                      visibleSundayCount={visibleSundayCount}
                      sundayCount={sundays.length}
                      onSelectSunday={handleSelectSunday}
                      onJumpPopoverOpenChange={setJumpPopoverOpen}
                      onJumpDateSelect={handleJumpDateSelect}
                      onShowMore={() =>
                        setVisibleSundayCount((prev) => Math.min(prev + VISIBLE_SUNDAY_INCREMENT, sundays.length))
                      }
                    />
                  </div>
                </div>
              ) : activeTab === "horizon" ? (
                <HorizonPanel
                  sundays={sundays}
                  meetingsByDate={meetingsByDate}
                  defaultLanguage={defaultLanguageRef.current}
                  onOpen={(isoDate) => {
                    handleSelectSunday(isoDate)
                    setActiveTab("meeting")
                  }}
                />
              ) : (
                <NotesPanel
                  notes={selectedNotes}
                  onNotesChange={handleNotesTextChange}
                />
              )}
          </section>
      </div>
      <DirectorySelectDialog
        open={directoryModalOpen}
        onOpenChange={(open) => {
          setDirectoryModalOpen(open)
          if (!open) {
            setDirectoryTarget(null)
          }
        }}
        people={directoryPeople}
        isLoading={isDirectoryLoading}
        onSelect={handleSelectDirectoryPerson}
      />
      {conductOpen && (
        <ConductView
          meeting={{
            title: selectedMeeting.title,
            specialType: selectedMeeting.specialType,
            assignments: selectedMeeting.assignments,
            entries: visibleEntries,
            announcements: selectedNotes.announcements.filter((i) => i.checked).map((i) => i.title).join(", "),
          }}
          isoDate={selectedSunday.isoDate}
          onClose={() => setConductOpen(false)}
        />
      )}
      {audienceOpen && (
        <SacramentMeetingAudienceView
          unitName={unitName}
          meeting={{
            title: selectedMeeting.title,
            specialType: selectedMeeting.specialType,
            assignments: selectedMeeting.assignments,
            entries: visibleEntries,
          }}
          isoDate={selectedSunday.isoDate}
          onClose={() => setAudienceOpen(false)}
        />
      )}

      <HymnSelectorModal
        open={hymnModalOpen}
        onClose={() => {
          setHymnModalOpen(false)
          setHymnTarget(null)
        }}
        onSelect={handleSelectHymn}
        defaultLanguage={defaultLanguage}
        sacramentOnly={hymnTarget?.entryId === "sacrament-hymn"}
        currentHymnId={
          hymnTarget
            ? (
                visibleEntries.find(
                  (entry) => entry.id === hymnTarget.entryId && entry.kind === "static"
                ) as StaticEntry | undefined
              )?.hymnId
            : undefined
        }
      />
    </div>
  )
}

function AgendaRow({
  entry,
  onSelectSpeaker,
  onSpeakerFieldChange,
  onDeleteSpeaker,
  onDeleteStaticEntry,
  onSelectAgendaAssignee,
  onSelectHymn,
}: {
  entry: AgendaEntry
  onSelectSpeaker: (entryId: string) => void
  onSpeakerFieldChange: (
    entryId: string,
    field: "topic" | "time",
    value: string | number | null
  ) => void
  onDeleteSpeaker: (entryId: string) => void
  onDeleteStaticEntry: (entryId: string) => void
  onSelectAgendaAssignee: (entryId: string, field: AgendaAssigneeField) => void
  onSelectHymn: (entryId: string) => void
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
        "group rounded-xl border border-border/70 bg-surface-raised px-3 py-3 transition-shadow",
        isDragging && "shadow-lg"
      )}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          className={cn(
            "mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors",
            canDrag ? "cursor-grab hover:bg-muted/50 hover:text-foreground" : "cursor-default"
          )}
          {...(canDrag ? attributes : {})}
          {...(canDrag ? listeners : {})}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 text-sm font-medium text-foreground">
              {entry.title}
            </div>
            {(entry.kind === "speaker" || (entry.kind === "static" && entry.removable)) ? (
              <EntryActionsMenu
                onDelete={() =>
                  entry.kind === "speaker"
                    ? onDeleteSpeaker(entry.id)
                    : onDeleteStaticEntry(entry.id)
                }
                label={entry.title}
              />
            ) : null}
          </div>
          {entry.kind === "speaker" ? (
            <div className="mt-1 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onSelectSpeaker(entry.id)}
                  className="inline-flex min-w-0 items-center gap-2 rounded-md px-1.5 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                >
                  <Search className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">
                    {entry.speakerName || "Tap to assign speaker"}
                  </span>
                </button>
              </div>
              <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_120px]">
                <label className="rounded-lg border border-border/70 bg-muted/30 px-2.5 py-2">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Topic
                  </div>
                  <input
                    value={entry.topic}
                    onChange={(event) =>
                      onSpeakerFieldChange(entry.id, "topic", event.target.value)
                    }
                    placeholder="Add topic"
                    className="mt-1 w-full border-0 bg-transparent p-0 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  />
                </label>
                <label className="rounded-lg border border-border/70 bg-muted/30 px-2.5 py-2">
                  <div className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    <Clock3 className="h-3 w-3" />
                    Time
                  </div>
                  <Select
                    value={entry.durationMinutes?.toString() ?? ""}
                    onValueChange={(value) =>
                      onSpeakerFieldChange(entry.id, "time", Number(value))
                    }
                  >
                    <SelectTrigger className="mt-1 h-auto border-0 bg-transparent px-0 py-0 text-sm shadow-none focus:border-transparent">
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent className="max-h-44">
                      {SPEAKER_TIME_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option.toString()}>
                          {option} min
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
              </div>
            </div>
          ) : entry.kind === "static" && typeof entry.hymnId !== "undefined" ? (
            <div className="mt-1 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => onSelectHymn(entry.id)}
                className="inline-flex min-w-0 items-center gap-2 rounded-md px-1.5 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              >
                <Search className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">
                  {entry.hymnNumber && entry.hymnTitle
                    ? `#${entry.hymnNumber} ${entry.hymnTitle}`
                    : "Select hymn"}
                </span>
              </button>
            </div>
          ) : entry.kind === "static" && entry.assigneeField ? (
            <button
              type="button"
              onClick={() => onSelectAgendaAssignee(entry.id, entry.assigneeField!)}
              className="mt-1 inline-flex items-center gap-2 rounded-md px-1.5 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            >
              <Search className="h-3.5 w-3.5" />
              <span>{entry.assigneeName || "Assign someone"}</span>
            </button>
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

function EntryActionsMenu({
  onDelete,
  label,
}: {
  onDelete: () => void
  label: string
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          aria-label={`${label} actions`}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuItem onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function DirectorySelectDialog({
  open,
  onOpenChange,
  people,
  isLoading,
  onSelect,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  people: DirectoryPerson[]
  isLoading: boolean
  onSelect: (personName: string) => void
}) {
  const [query, setQuery] = useState("")

  useEffect(() => {
    if (open) {
      setQuery("")
    }
  }, [open])

  const filteredPeople = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) {
      return people
    }

    return people.filter((person) => person.name.toLowerCase().includes(needle))
  }, [people, query])

  return (
    <PickerModal
      open={open}
      onOpenChange={onOpenChange}
      title="Assign person"
      searchSlot={
        <input
          className="w-full bg-transparent px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
          placeholder="Search members..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoFocus
        />
      }
    >
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : filteredPeople.length === 0 ? (
            <div className="px-5 py-8 text-center text-[13px] text-muted-foreground">
              No members match.
            </div>
          ) : (
            filteredPeople.map((person) => (
              <button
                key={person.id}
                type="button"
                onClick={() => onSelect(person.name)}
                className="flex w-full items-center gap-3 px-[18px] py-2 text-left transition-colors hover:bg-surface-hover"
              >
                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface-sunken text-[11px] font-semibold text-muted-foreground">
                  {getInitials(person.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-serif text-[14.5px] text-foreground">
                    {person.name}
                  </div>
                  <div className="truncate text-[11.5px] text-muted-foreground">
                    Directory member
                  </div>
                </div>
              </button>
            ))
          )}
    </PickerModal>
  )
}
