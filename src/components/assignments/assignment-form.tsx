"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ModalForm,
  ModalFormBody,
  ModalFormFooter,
  ModalFormSection,
} from "@/components/ui/modal-form-layout"
import { CalendarIcon, Check, CircleCheckBig, CircleDashed, ChevronsUpDown, X, Link as LinkIcon, ArrowLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"

export interface AgendaItem {
  id: string
  title: string
  item_type: string
  meetings: {
    id: string
    title: string
    scheduled_date: string | null
  } | null
}

export interface AssignmentFormData {
  directoryId: string
  assignmentType: string
  topic: string
  isConfirmed: boolean
  agendaItemId?: string
}

interface AssignmentFormProps {
  onSubmit: (data: AssignmentFormData) => Promise<void>
  isLoading?: boolean
  onCancel?: () => void
}

const ASSIGNMENT_TYPE_OPTIONS = [
  { value: "speaker", label: "Speaker" },
  { value: "prayer", label: "Prayer" },
  { value: "participant", label: "Participant" },
] as const

export function AssignmentForm({
  onSubmit,
  isLoading = false,
  onCancel,
}: AssignmentFormProps) {
  const [directoryId, setDirectoryId] = useState("")
  const [assignmentType, setAssignmentType] = useState("speaker")
  const [topic, setTopic] = useState("")
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [agendaItemId, setAgendaItemId] = useState("")

  // Directory entries
  const [directoryEntries, setDirectoryEntries] = useState<{ id: string; name: string }[]>([])
  const [agendas, setAgendas] = useState<AgendaItem[]>([])
  const [loadingDirectory, setLoadingDirectory] = useState(false)
  const [directorySearch, setDirectorySearch] = useState("")

  // Popover states
  const [assigneePopoverOpen, setAssigneePopoverOpen] = useState(false)
  const [statusPillOpen, setStatusPillOpen] = useState(false)
  
  // Agenda Two-Step Popover states
  const [agendaPopoverOpen, setAgendaPopoverOpen] = useState(false)
  const [agendaStep, setAgendaStep] = useState<"meeting" | "item">("meeting")
  const [selectedMeetingId, setSelectedMeetingId] = useState("")

  const isAssigneeSelected = directoryId !== ""

  const selectedAssigneeName =
    directoryEntries.find((d) => d.id === directoryId)?.name ?? ""

  const selectedAgenda = agendas.find((a) => a.id === agendaItemId)
  const agendaDateRaw = selectedAgenda?.meetings?.scheduled_date

  // Filter agendas based on the selected assignmentType
  const filteredAgendas = useMemo(() => {
    return agendas.filter((a) => {
      if (assignmentType === "speaker") {
        return a.item_type === "speaker"
      }
      if (assignmentType === "prayer") {
        return a.item_type === "prayer" || (a.title && a.title.toLowerCase().includes("prayer"))
      }
      if (assignmentType === "participant") {
        return a.item_type === "participant" || (a.item_type !== "speaker" && !(a.title && a.title.toLowerCase().includes("prayer")))
      }
      return true
    })
  }, [agendas, assignmentType])

  // Clear agenda item if it doesn't match the newly selected type
  useEffect(() => {
    if (agendaItemId && !filteredAgendas.find((a) => a.id === agendaItemId)) {
      setAgendaItemId("")
    }
  }, [assignmentType, filteredAgendas, agendaItemId])

  // Group filtered agendas to find unique meetings
  const uniqueMeetings = Array.from(new Set(filteredAgendas.map((a) => a.meetings?.id))).map(id => {
    return filteredAgendas.find((a) => a.meetings?.id === id)?.meetings;
  }).filter(Boolean);

  const currentMeetingItems = filteredAgendas.filter((a) => a.meetings?.id === selectedMeetingId);

  const isValid = directoryId.trim().length > 0

  // Fetch directory and agendas on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoadingDirectory(true)
      const supabase = createClient()
      
      // Fetch directory
      const { data: dirData, error: dirError } = await supabase.from("directory")
        .select("id, name")
        .order("name")

      if (dirError) {
        console.error("Error fetching directory:", dirError)
      } else {
        setDirectoryEntries(dirData || [])
      }

      // Fetch agendas
      const { data: agendaData } = await supabase.from("agenda_items")
        .select(`
          id,
          title,
          item_type,
          meetings!inner (
            id,
            title,
            scheduled_date
          )
        `)
        .order("created_at", { ascending: false })
        .limit(100)

      if (agendaData) {
        setAgendas(agendaData)
      }

      setLoadingDirectory(false)
    }
    fetchData()
  }, [])

  const filteredDirectory = directorySearch
    ? directoryEntries.filter((d) =>
      d.name.toLowerCase().includes(directorySearch.toLowerCase())
    )
    : directoryEntries

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return
    await onSubmit({
      directoryId,
      assignmentType,
      topic,
      isConfirmed,
      agendaItemId: agendaItemId || undefined,
    })
  }

  return (
    <ModalForm onSubmit={handleSubmit}>
      <ModalFormBody className="w-full space-y-4 pt-4 pb-2">
        <ModalFormSection className="space-y-5">
          
          {/* Assignee Field (Combobox style) */}
          <div className="space-y-2 flex flex-col">
            <Label>Assignee</Label>
            <Popover open={assigneePopoverOpen} onOpenChange={setAssigneePopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={assigneePopoverOpen}
                  className="w-full justify-between font-normal"
                  disabled={isLoading}
                >
                  {isAssigneeSelected ? selectedAssigneeName : "Select assignee..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-1" align="start">
                <div className="px-2 pb-1.5 pt-1">
                  <Input
                    placeholder="Search directory..."
                    value={directorySearch}
                    onChange={(e) => setDirectorySearch(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div style={{ maxHeight: 200, overflowY: "auto" }}>
                  {loadingDirectory ? (
                    <p className="px-2.5 py-1.5 text-xs text-muted-foreground">Loading...</p>
                  ) : filteredDirectory.length === 0 ? (
                    <p className="px-2.5 py-1.5 text-xs text-muted-foreground">No results.</p>
                  ) : (
                    filteredDirectory.map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => {
                          setDirectoryId(entry.id)
                          setAssigneePopoverOpen(false)
                          setDirectorySearch("")
                        }}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                          directoryId === entry.id
                            ? "bg-accent text-accent-foreground font-medium"
                            : "text-foreground hover:bg-accent/50"
                        )}
                      >
                        <span className="inline-flex h-4 w-4 items-center justify-center">
                          {directoryId === entry.id ? (
                            <Check className="h-3 w-3" />
                          ) : null}
                        </span>
                        {entry.name}
                      </button>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Type Field */}
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={assignmentType} onValueChange={setAssignmentType} disabled={isLoading}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {ASSIGNMENT_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Topic Field (only if Speaker) */}
          {assignmentType === "speaker" && (
            <div className="space-y-2">
              <Label htmlFor="assignment-topic">Topic</Label>
              <Input
                id="assignment-topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Faith and Service"
                disabled={isLoading}
              />
            </div>
          )}



          <div className="space-y-2 pt-2">
            <Label htmlFor="assignment-notes">Notes</Label>
            <Textarea
              id="assignment-notes"
              placeholder="Additional notes about this assignment..."
              rows={3}
              disabled={isLoading}
              className="resize-none text-sm"
            />
          </div>

          {/* Bottom Pills Section */}
          <div className="space-y-2 pt-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Link to Agenda pill (Two-Step Popover) */}
              <Popover 
                open={agendaPopoverOpen} 
                onOpenChange={(isOpen) => {
                  setAgendaPopoverOpen(isOpen)
                  if (!isOpen) {
                    // Slight delay to reset step so hiding transition looks clean
                    setTimeout(() => setAgendaStep("meeting"), 200)
                  }
                }}
              >
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isLoading || filteredAgendas.length === 0}
                    className={cn(
                      "h-7 w-auto rounded-full px-2.5 text-[11px] font-medium shadow-sm transition-colors",
                      agendaItemId
                        ? "border-transparent bg-[hsl(var(--chip-active-bg))] text-[hsl(var(--chip-active-text))]"
                        : "border-[hsl(var(--chip-border))] bg-background text-[hsl(var(--chip-text))] hover:bg-[hsl(var(--chip-hover-bg))]"
                    )}
                  >
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap leading-none">
                      <LinkIcon className="h-2.5 w-2.5 shrink-0" />
                      Link to agenda item
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-1" align="start">
                  {agendaStep === "meeting" ? (
                    <div>
                      <div className="px-2.5 py-1.5 text-xs font-semibold text-muted-foreground">Select a meeting</div>
                      <div className="max-h-[220px] overflow-y-auto">
                        {uniqueMeetings.map((meeting: NonNullable<AgendaItem["meetings"]>) => (
                          <button
                            key={meeting.id}
                            type="button"
                            onClick={() => {
                              setSelectedMeetingId(meeting.id)
                              setAgendaStep("item")
                            }}
                            className="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-[13px] text-foreground hover:bg-accent/50 transition-colors"
                          >
                            <span className="truncate pr-2">
                              {meeting.title} <span className="text-[11px] text-muted-foreground ml-1">{meeting.scheduled_date ? new Date(meeting.scheduled_date).toLocaleDateString() : ""}</span>
                            </span>
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-1 px-1.5 py-1 text-xs font-semibold text-muted-foreground border-b mb-1 pb-1.5">
                        <button 
                          type="button"
                          onClick={() => setAgendaStep("meeting")}
                          className="p-1 hover:bg-accent rounded"
                        >
                          <ArrowLeft className="h-3.5 w-3.5" />
                        </button>
                        <span>Select agenda item</span>
                      </div>
                      <div className="max-h-[220px] overflow-y-auto">
                        {currentMeetingItems.length === 0 ? (
                          <div className="px-2.5 py-1.5 text-[12px] text-muted-foreground text-center italic">No items found</div>
                        ) : (
                          currentMeetingItems.map((item: AgendaItem) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                setAgendaItemId(item.id)
                                setAgendaPopoverOpen(false)
                              }}
                              className={cn(
                                "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] transition-colors text-left",
                                agendaItemId === item.id
                                  ? "bg-accent text-accent-foreground font-medium"
                                  : "text-foreground hover:bg-accent/50"
                              )}
                            >
                              <span className="inline-flex h-4 w-4 items-center justify-center shrink-0">
                                {agendaItemId === item.id ? (
                                  <Check className="h-3 w-3" />
                                ) : null}
                              </span>
                              <span className="truncate">{item.title}</span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </PopoverContent>
              </Popover>

              {/* Status pill */}
              <Popover open={statusPillOpen} onOpenChange={setStatusPillOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isLoading}
                    className={cn(
                      "h-7 rounded-full px-2.5 text-[11px] font-medium shadow-sm transition-colors",
                      isConfirmed
                        ? "border-transparent bg-[hsl(var(--chip-active-bg))] text-[hsl(var(--chip-active-text))]"
                        : "border-[hsl(var(--chip-border))] bg-background text-[hsl(var(--chip-text))] hover:bg-[hsl(var(--chip-hover-bg))]"
                    )}
                  >
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap leading-none">
                      {isConfirmed ? (
                        <CircleCheckBig className="h-2.5 w-2.5 shrink-0" />
                      ) : (
                        <CircleDashed className="h-2.5 w-2.5 shrink-0" />
                      )}
                      {isConfirmed ? "Confirmed" : "Status"}
                      {isConfirmed && (
                        <span
                          role="button"
                          tabIndex={-1}
                          onMouseDown={(e) => {
                            e.stopPropagation()
                            e.preventDefault()
                            setIsConfirmed(false)
                          }}
                          className="ml-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full hover:bg-black/10 dark:hover:bg-white/20"
                        >
                          <X className="h-2.5 w-2.5" />
                        </span>
                      )}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-40 p-1" align="start">
                  {[
                    { value: false, label: "Pending", icon: CircleDashed },
                    { value: true, label: "Confirmed", icon: CircleCheckBig },
                  ].map((opt) => (
                    <button
                      key={String(opt.value)}
                      type="button"
                      onClick={() => {
                        setIsConfirmed(opt.value)
                        setStatusPillOpen(false)
                      }}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] transition-colors",
                        isConfirmed === opt.value
                          ? "bg-accent text-accent-foreground font-medium"
                          : "text-foreground hover:bg-accent/50"
                      )}
                    >
                      <opt.icon className="h-3.5 w-3.5" />
                      {opt.label}
                    </button>
                  ))}
                </PopoverContent>
              </Popover>
            </div>

            {/* Display Selected Agenda Info below the pills */}
            {agendaItemId && selectedAgenda && (
               <div className="flex flex-wrap items-center gap-2 pt-1">
                 <span className="inline-flex items-center gap-1 rounded-full border border-muted bg-muted px-2.5 py-1 text-xs text-foreground">
                   {selectedAgenda.title}
                   <button
                     type="button"
                     onClick={() => setAgendaItemId("")}
                     className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
                     aria-label="Remove agenda link"
                   >
                     <X className="h-3 w-3" />
                   </button>
                 </span>
                 {agendaDateRaw && (
                   <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] text-muted-foreground">
                     <CalendarIcon className="h-3 w-3" />
                     Scheduled for {new Date(agendaDateRaw).toLocaleDateString()}
                   </span>
                 )}
               </div>
            )}
          </div>
          
        </ModalFormSection>
      </ModalFormBody>

      <ModalFormFooter>
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={isLoading}
          className="h-8 rounded-full px-3 text-xs"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isLoading || !isValid}
          className="h-8 rounded-full px-3 text-xs"
        >
          {isLoading ? "Creating..." : "Create Assignment"}
        </Button>
      </ModalFormFooter>
    </ModalForm>
  )
}
