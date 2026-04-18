"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { addDays, format, startOfDay } from "date-fns"
import {
  CircleCheck,
  Check,
  Clock3,
  GripVertical,
  Landmark,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
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
import { HymnSelectorModal } from "@/components/meetings/hymn-selector-modal"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

type MeetingSpecialType = "standard" | "fast-testimony" | "ward-conference"
type AssignmentField = "presiding" | "conductor" | "chorister" | "accompanist"
type AgendaAssigneeField = "invocation" | "benediction"
type DirectoryTarget =
  | { type: "assignment"; field: AssignmentField }
  | { type: "agenda-assignee"; entryId: string; field: AgendaAssigneeField }
  | { type: "speaker"; entryId: string }
type HymnTarget = { entryId: string }

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
  specialType: MeetingSpecialType
  assignments: Record<AssignmentField, string>
  standardEntries: AgendaEntry[]
  fastEntries: AgendaEntry[]
}

type DirectoryPerson = {
  id: string
  name: string
}

const SECTION_CLOSING_ID = "section-closing"
const PLANNER_DRAFT_STORAGE_KEY = "beespo:sacrament-meeting:planner:draft:v1"

type Lang = "ENG" | "SPA"

const ENTRY_LABELS: Record<string, Record<Lang, string>> = {
  "section-opening":     { ENG: "Opening",                          SPA: "Apertura" },
  "opening-hymn":        { ENG: "Opening Hymn",                     SPA: "Himno de Apertura" },
  "invocation":          { ENG: "Invocation",                       SPA: "Invocación" },
  "ward-business":       { ENG: "Ward Business",                    SPA: "Asuntos del Barrio" },
  "section-ordinance":   { ENG: "Ordinance",                        SPA: "Ordenanza" },
  "sacrament-hymn":      { ENG: "Sacrament Hymn",                   SPA: "Himno del Sacramento" },
  "sacrament-ordinance": { ENG: "Administration of the Sacrament",  SPA: "Administración del Sacramento" },
  "section-messages":    { ENG: "Messages",                         SPA: "Mensajes" },
  [SECTION_CLOSING_ID]:  { ENG: "Closing",                          SPA: "Clausura" },
  "closing-hymn":        { ENG: "Closing Hymn",                     SPA: "Himno de Clausura" },
  "benediction":         { ENG: "Benediction",                      SPA: "Bendición" },
}

const SPEAKER_LABEL: Record<Lang, string> = { ENG: "Speaker", SPA: "Orador" }
const AUTOSAVE_DELAY_MS = 8000
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
    }
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

  return { assignedCount, totalCount }
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
      detail: lang === "SPA" ? "Bendición y distribución del sacramento" : "Blessing and passing of the sacrament",
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
      detail: lang === "SPA" ? "Bendición y distribución del sacramento" : "Blessing and passing of the sacrament",
    },
    { id: "section-messages", kind: "section", title: t("section-messages") },
    {
      id: "testimonies",
      kind: "testimony",
      title: lang === "SPA" ? "Testimonios de miembros de la congregación" : "Testimonies by members of the congregation",
      detail: lang === "SPA" ? "Formato de micrófono abierto después del sacramento." : "Open microphone format following the sacrament.",
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
    specialType: "standard",
    assignments: {
      presiding: "",
      conductor: "",
      chorister: "",
      accompanist: "",
    },
    standardEntries: createStandardEntries(isoDate, lang),
    fastEntries: createFastEntries(lang),
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

export function SacramentMeetingPlannerClient({ defaultLanguage = "ENG" }: { defaultLanguage?: Lang }) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  const sundays = useMemo(() => getNextEightSundays(), [])
  const [directoryPeople, setDirectoryPeople] = useState<DirectoryPerson[]>([])
  const [isDirectoryLoading, setIsDirectoryLoading] = useState(false)
  const [directoryModalOpen, setDirectoryModalOpen] = useState(false)
  const [directoryTarget, setDirectoryTarget] = useState<DirectoryTarget | null>(null)
  const [hymnModalOpen, setHymnModalOpen] = useState(false)
  const [hymnTarget, setHymnTarget] = useState<HymnTarget | null>(null)
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

  const selectedMeeting = meetingsByDate[selectedSunday.isoDate]
  const visibleEntries = getVisibleAgendaEntries(selectedMeeting)
  const selectedMeetingTitle = getMeetingTitle(selectedMeeting.specialType)
  const selectedMeetingStats = getPlannerAssignmentStats(selectedMeeting)

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

  useEffect(() => {
    if (!directoryModalOpen || directoryPeople.length > 0) {
      return
    }

    let isMounted = true

    const loadDirectoryPeople = async () => {
      setIsDirectoryLoading(true)
      const supabase = createClient()
      const { data, error } = await (supabase.from("directory") as ReturnType<typeof supabase.from>)
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

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PLANNER_DRAFT_STORAGE_KEY)
      if (!raw) {
        hasLoadedDraftRef.current = true
        return
      }

      const parsed = JSON.parse(raw) as {
        meetingsByDate?: Record<string, Partial<PlannerMeetingState>>
        savedAt?: string
      }

      if (parsed.meetingsByDate) {
        setMeetingsByDate((prev) => {
          const next = { ...prev }

          for (const sunday of sundays) {
            const savedMeeting = parsed.meetingsByDate?.[sunday.isoDate]
            if (!savedMeeting) continue

            next[sunday.isoDate] = {
              ...prev[sunday.isoDate],
              ...savedMeeting,
              assignments: {
                ...prev[sunday.isoDate].assignments,
                ...(savedMeeting.assignments ?? {}),
              },
              standardEntries: Array.isArray(savedMeeting.standardEntries)
                ? (savedMeeting.standardEntries as AgendaEntry[])
                : prev[sunday.isoDate].standardEntries,
              fastEntries: Array.isArray(savedMeeting.fastEntries)
                ? (savedMeeting.fastEntries as AgendaEntry[])
                : prev[sunday.isoDate].fastEntries,
            }
          }

          return next
        })
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

    window.addEventListener("pagehide", flushDraft)
    window.addEventListener("beforeunload", flushDraft)

    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current)
        autosaveTimeoutRef.current = null
      }
      window.removeEventListener("pagehide", flushDraft)
      window.removeEventListener("beforeunload", flushDraft)
    }
  }, [meetingsByDate])

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
        title: "Speaker",
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
        title: "Intermediate Hymn",
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
        title: "Special Number",
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

  const messagesInsertIndex = visibleEntries.findIndex((entry) => entry.id === SECTION_CLOSING_ID)
  const autosaveLabel =
    autosaveStatus === "saving"
      ? "Saving draft..."
      : autosaveStatus === "error"
        ? "Autosave failed"
        : lastSavedAt
          ? `Saved ${format(lastSavedAt, "h:mm a")}`
          : "Draft autosaves"

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
                const stats = getPlannerAssignmentStats(meeting)
                const isSelected = sunday.isoDate === selectedSunday.isoDate
                const isFullyAssigned =
                  stats.totalCount > 0 && stats.assignedCount === stats.totalCount
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
                          {stats.assignedCount}/{stats.totalCount} assigned
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

                  <div className="inline-flex items-center gap-2 self-start rounded-full border border-border/70 bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground">
                    {selectedMeetingStats.totalCount > 0 &&
                    selectedMeetingStats.assignedCount === selectedMeetingStats.totalCount ? (
                      <CircleCheck className="h-3.5 w-3.5 text-emerald-600" />
                    ) : null}
                    <span>
                      {selectedMeetingStats.assignedCount}/{selectedMeetingStats.totalCount} assigned
                    </span>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {autosaveLabel}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <AssignmentInput
                      label="Presiding"
                      value={selectedMeeting.assignments.presiding}
                      onSelect={() =>
                        handleOpenDirectoryPicker({
                          type: "assignment",
                          field: "presiding",
                        })
                      }
                    />
                    <AssignmentInput
                      label="Conductor"
                      value={selectedMeeting.assignments.conductor}
                      onSelect={() =>
                        handleOpenDirectoryPicker({
                          type: "assignment",
                          field: "conductor",
                        })
                      }
                    />
                    <AssignmentInput
                      label="Chorister"
                      value={selectedMeeting.assignments.chorister}
                      onSelect={() =>
                        handleOpenDirectoryPicker({
                          type: "assignment",
                          field: "chorister",
                        })
                      }
                    />
                    <AssignmentInput
                      label="Organist / Pianist"
                      value={selectedMeeting.assignments.accompanist}
                      onSelect={() =>
                        handleOpenDirectoryPicker({
                          type: "assignment",
                          field: "accompanist",
                        })
                      }
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
                            {selectedMeeting.specialType !== "fast-testimony" &&
                            messagesInsertIndex > 0 &&
                            index === messagesInsertIndex - 1 ? (
                              <div className="px-1 py-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={handleAddSpeaker}
                                    className="inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-[#fafaf9] hover:text-foreground"
                                  >
                                    <Plus className="h-4 w-4" />
                                    Add speaker
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleAddIntermediateHymn}
                                    className="inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-[#fafaf9] hover:text-foreground"
                                  >
                                    <Plus className="h-4 w-4" />
                                    Add intermediate hymn
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleAddSpecialNumber}
                                    className="inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-[#fafaf9] hover:text-foreground"
                                  >
                                    <Plus className="h-4 w-4" />
                                    Add special number
                                  </button>
                                </div>
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
      <HymnSelectorModal
        open={hymnModalOpen}
        onClose={() => {
          setHymnModalOpen(false)
          setHymnTarget(null)
        }}
        onSelect={handleSelectHymn}
        defaultLanguage={defaultLanguage}
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

function AssignmentInput({
  label,
  value,
  onSelect,
}: {
  label: string
  value: string
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="rounded-xl border border-border/70 bg-[#fcfcfb] px-3 py-2.5 text-left transition-colors hover:bg-white"
    >
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 flex items-center gap-2 text-sm text-foreground">
        <Search className="h-3.5 w-3.5 text-muted-foreground" />
        <span className={cn(!value && "text-muted-foreground")}>
          {value || "Select from directory"}
        </span>
      </div>
    </button>
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
                  className="inline-flex min-w-0 items-center gap-2 rounded-md px-1.5 py-1 text-sm text-muted-foreground transition-colors hover:bg-[#fafaf9] hover:text-foreground"
                >
                  <Search className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">
                    {entry.speakerName || "Select speaker from directory"}
                  </span>
                </button>
              </div>
              <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_120px]">
                <label className="rounded-lg border border-border/70 bg-[#fcfcfb] px-2.5 py-2">
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
                <label className="rounded-lg border border-border/70 bg-[#fcfcfb] px-2.5 py-2">
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
                    <SelectContent align="end" className="max-h-44">
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
                className="inline-flex min-w-0 items-center gap-2 rounded-md px-1.5 py-1 text-sm text-muted-foreground transition-colors hover:bg-[#fafaf9] hover:text-foreground"
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
              className="mt-1 inline-flex items-center gap-2 rounded-md px-1.5 py-1 text-sm text-muted-foreground transition-colors hover:bg-[#fafaf9] hover:text-foreground"
            >
              <Search className="h-3.5 w-3.5" />
              <span>{entry.assigneeName || "Select from directory"}</span>
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
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-[#fafaf9] hover:text-foreground"
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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-5">
          <DialogTitle className="text-base font-semibold tracking-tight">
            Select from directory
          </DialogTitle>
          <DialogDescription className="text-[13px] leading-snug text-muted-foreground">
            Search for a member and assign them to this part of the meeting.
          </DialogDescription>
        </DialogHeader>
        <Command className="rounded-none">
          <div className="border-b px-4 py-3">
            <CommandInput placeholder="Search directory..." className="h-9" />
          </div>
          <CommandList className="max-h-[320px]">
            <CommandEmpty>No one found.</CommandEmpty>
            <CommandGroup>
              {isLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                people.map((person) => (
                  <CommandItem
                    key={person.id}
                    value={person.name}
                    onSelect={() => onSelect(person.name)}
                    className="mx-2 my-1 rounded-lg px-3 py-2 text-sm"
                  >
                    <Check className="mr-2 h-4 w-4 opacity-0" />
                    {person.name}
                  </CommandItem>
                ))
              )}
            </CommandGroup>
          </CommandList>
          <div className="border-t px-4 py-3">
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-center"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
