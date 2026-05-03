"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FormRichTextEditor } from "@/components/ui/form-rich-text-editor"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  ModalForm,
  ModalFormBody,
  ModalFormFooter,
  ModalFormSection,
} from "@/components/ui/modal-form-layout"
import { TemplateSelector } from "@/components/templates/template-selector"
import { DatePickerDialog } from "@/components/ui/date-picker-dialog"
import { CalendarDays, Link as LinkIcon, SignalHigh, X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface AnnouncementFormData {
  title: string
  content: string
  priority: "low" | "medium" | "high"
  displayStart: string
  displayUntil: string
  templateIds: string[]
}

interface AnnouncementFormProps {
  onSubmit: (data: AnnouncementFormData) => Promise<void>
  isLoading?: boolean
  onCancel?: () => void
}

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
] as const

function formatPillDate(iso: string): string {
  const date = new Date(iso + "T00:00:00")
  const day = date.getDate()
  const suffix =
    day === 1 || day === 21 || day === 31
      ? "st"
      : day === 2 || day === 22
      ? "nd"
      : day === 3 || day === 23
      ? "rd"
      : "th"
  const month = date.toLocaleDateString("en-US", { month: "short" })
  return `${month} ${day}${suffix}`
}

export function AnnouncementForm({
  onSubmit,
  isLoading = false,
  onCancel,
}: AnnouncementFormProps) {
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium")
  const [startShowingOn, setStartShowingOn] = useState("")
  const [stopShowingAfter, setStopShowingAfter] = useState("")
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([])
  const [templateOptions, setTemplateOptions] = useState<{ id: string; name: string }[]>([])

  // Dialog / popover open states
  const [startDialogOpen, setStartDialogOpen] = useState(false)
  const [stopDialogOpen, setStopDialogOpen] = useState(false)
  const [priorityOpen, setPriorityOpen] = useState(false)

  const isValid = title.trim().length > 0
  const isPriorityChanged = priority !== "medium"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return
    await onSubmit({
      title,
      content,
      priority,
      displayStart: startShowingOn,
      displayUntil: stopShowingAfter,
      templateIds: selectedTemplateIds,
    })
  }

  return (
    <ModalForm onSubmit={handleSubmit}>
      <ModalFormBody className="w-full space-y-4 pt-2 pb-2">
        <ModalFormSection>
          <div className="space-y-2">
            <Label htmlFor="title">Title*</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Ward Activity Next Saturday"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label>Details</Label>
            <FormRichTextEditor
              value={content}
              onChange={setContent}
              placeholder="Announcement details..."
              disabled={isLoading}
              hasError={false}
            />
          </div>
        </ModalFormSection>

        <ModalFormSection className="pt-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {/* Priority pill */}
              <Popover open={priorityOpen} onOpenChange={setPriorityOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isLoading}
                    className={cn(
                      "h-7 rounded-full px-2.5 text-[11px] font-medium shadow-sm transition-colors",
                      isPriorityChanged
                        ? "border-transparent bg-[hsl(var(--chip-active-bg))] text-[hsl(var(--chip-active-text))]"
                        : "border-[hsl(var(--chip-border))] bg-background text-[hsl(var(--chip-text))] hover:bg-[hsl(var(--chip-hover-bg))]"
                    )}
                  >
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap leading-none">
                      <SignalHigh className="h-2.5 w-2.5 shrink-0" />
                      {isPriorityChanged
                        ? `Priority: ${priority.charAt(0).toUpperCase() + priority.slice(1)}`
                        : "Priority"}

                      {isPriorityChanged && (
                        <span
                          role="button"
                          tabIndex={-1}
                          onMouseDown={(e) => {
                            e.stopPropagation()
                            e.preventDefault()
                            setPriority("medium")
                          }}
                          className="ml-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full hover:bg-black/10 dark:hover:bg-white/20"
                        >
                          <X className="h-2.5 w-2.5" />
                        </span>
                      )}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-36 p-1" align="start">
                  {PRIORITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setPriority(opt.value)
                        setPriorityOpen(false)
                      }}
                      className={cn(
                        "flex w-full items-center rounded-md px-2.5 py-1.5 text-[13px] transition-colors",
                        priority === opt.value
                          ? "bg-accent text-accent-foreground font-medium"
                          : "text-foreground hover:bg-accent/50"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </PopoverContent>
              </Popover>

              {/* Start showing on pill */}
              <Button
                type="button"
                variant="outline"
                disabled={isLoading}
                onClick={() => setStartDialogOpen(true)}
                className={cn(
                  "h-7 rounded-full px-2.5 text-[11px] font-medium shadow-sm transition-colors",
                  startShowingOn
                    ? "border-transparent bg-[hsl(var(--chip-active-bg))] text-[hsl(var(--chip-active-text))]"
                    : "border-[hsl(var(--chip-border))] bg-background text-[hsl(var(--chip-text))] hover:bg-[hsl(var(--chip-hover-bg))]"
                )}
              >
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap leading-none">
                  <CalendarDays className="h-2.5 w-2.5 shrink-0" />
                  {startShowingOn
                    ? `Start showing on ${formatPillDate(startShowingOn)}`
                    : "Start showing on"}
                  {startShowingOn && (
                    <span
                      role="button"
                      tabIndex={-1}
                      onMouseDown={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        setStartShowingOn("")
                      }}
                      className="ml-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full hover:bg-black/10 dark:hover:bg-white/20"
                    >
                      <X className="h-2.5 w-2.5" />
                    </span>
                  )}
                </span>
              </Button>

              <DatePickerDialog
                open={startDialogOpen}
                onOpenChange={setStartDialogOpen}
                titleAccent="date"
                description="Set a date to start showing the announcement in your meeting agendas."
                saveLabel="Save date"
                value={startShowingOn}
                onSave={setStartShowingOn}
              />

              {/* Stop showing after pill */}
              <Button
                type="button"
                variant="outline"
                disabled={isLoading}
                onClick={() => setStopDialogOpen(true)}
                className={cn(
                  "h-7 rounded-full px-2.5 text-[11px] font-medium shadow-sm transition-colors",
                  stopShowingAfter
                    ? "border-transparent bg-[hsl(var(--chip-active-bg))] text-[hsl(var(--chip-active-text))]"
                    : "border-[hsl(var(--chip-border))] bg-background text-[hsl(var(--chip-text))] hover:bg-[hsl(var(--chip-hover-bg))]"
                )}
              >
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap leading-none">
                  <CalendarDays className="h-2.5 w-2.5 shrink-0" />
                  {stopShowingAfter
                    ? `Stop showing after ${formatPillDate(stopShowingAfter)}`
                    : "Stop showing after"}
                  {stopShowingAfter && (
                    <span
                      role="button"
                      tabIndex={-1}
                      onMouseDown={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        setStopShowingAfter("")
                      }}
                      className="ml-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full hover:bg-black/10 dark:hover:bg-white/20"
                    >
                      <X className="h-2.5 w-2.5" />
                    </span>
                  )}
                </span>
              </Button>

              <DatePickerDialog
                open={stopDialogOpen}
                onOpenChange={setStopDialogOpen}
                titleAccent="date"
                description="Set a date to stop showing the announcement in your meeting agendas."
                saveLabel="Save date"
                value={stopShowingAfter}
                onSave={setStopShowingAfter}
              />

              {/* Link to template pill */}
              <TemplateSelector
                value={selectedTemplateIds}
                onChange={setSelectedTemplateIds}
                onTemplatesLoaded={setTemplateOptions}
                disabled={isLoading}
                mode="pill"
                pillLabel="Link to template"
                pillIcon={<LinkIcon className="h-2.5 w-2.5 shrink-0" />}
              />
            </div>

            {selectedTemplateIds.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedTemplateIds.map((templateId) => {
                  const name =
                    templateOptions.find((t) => t.id === templateId)?.name ?? "Template"
                  return (
                    <span
                      key={templateId}
                      className="inline-flex items-center gap-1 rounded-full border border-muted bg-muted px-2.5 py-1 text-xs text-foreground"
                    >
                      {name}
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedTemplateIds((prev) =>
                            prev.filter((id) => id !== templateId)
                          )
                        }
                        className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
                        aria-label={`Remove ${name}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )
                })}
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
          {isLoading ? "Creating..." : "Create Announcement"}
        </Button>
      </ModalFormFooter>
    </ModalForm>
  )
}
