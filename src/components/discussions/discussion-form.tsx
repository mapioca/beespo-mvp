"use client"

import { useState } from "react"
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
  ModalForm,
  ModalFormBody,
  ModalFormFooter,
  ModalFormSection,
} from "@/components/ui/modal-form-layout"
import { TemplateSelector } from "@/components/templates/template-selector"
import { Link as LinkIcon, SignalHigh, Tag, X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface DiscussionFormData {
  title: string
  description: string
  priority: "low" | "medium" | "high"
  category: string
  templateIds: string[]
}

interface DiscussionFormProps {
  onSubmit: (data: DiscussionFormData) => Promise<void>
  isLoading?: boolean
  onCancel?: () => void
}

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
] as const

const CATEGORY_OPTIONS = [
  { value: "member_concerns", label: "Member Concerns" },
  { value: "activities", label: "Activities" },
  { value: "service_opportunities", label: "Service Opportunities" },
  { value: "callings", label: "Callings" },
  { value: "temple_work", label: "Temple Work" },
  { value: "budget", label: "Budget" },
  { value: "facilities", label: "Facilities" },
  { value: "youth", label: "Youth" },
  { value: "mission_work", label: "Mission Work" },
  { value: "other", label: "Other" },
] as const

export function DiscussionForm({
  onSubmit,
  isLoading = false,
  onCancel,
}: DiscussionFormProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium")
  const [category, setCategory] = useState("member_concerns")
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([])
  const [templateOptions, setTemplateOptions] = useState<{ id: string; name: string }[]>([])

  // Popover open states
  const [priorityOpen, setPriorityOpen] = useState(false)
  const [categoryOpen, setCategoryOpen] = useState(false)

  const isValid = title.trim().length > 0
  const isPriorityChanged = priority !== "medium"
  const isCategoryChanged = category !== "member_concerns"

  const categoryLabel = CATEGORY_OPTIONS.find((o) => o.value === category)?.label ?? category

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return
    await onSubmit({
      title,
      description,
      priority,
      category,
      templateIds: selectedTemplateIds,
    })
  }

  return (
    <ModalForm onSubmit={handleSubmit}>
      <ModalFormBody className="w-full space-y-4 pt-2 pb-2">
        <ModalFormSection>
          <div className="space-y-2">
            <Label htmlFor="disc-title">Title*</Label>
            <Input
              id="disc-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Youth Program Planning for Summer"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="disc-description">Description</Label>
            <Textarea
              id="disc-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the discussion topic and what needs to be decided..."
              rows={4}
              disabled={isLoading}
              className="resize-none"
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

              {/* Category pill */}
              <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isLoading}
                    className={cn(
                      "h-7 rounded-full px-2.5 text-[11px] font-medium shadow-sm transition-colors",
                      isCategoryChanged
                        ? "border-transparent bg-[hsl(var(--chip-active-bg))] text-[hsl(var(--chip-active-text))]"
                        : "border-[hsl(var(--chip-border))] bg-background text-[hsl(var(--chip-text))] hover:bg-[hsl(var(--chip-hover-bg))]"
                    )}
                  >
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap leading-none">
                      <Tag className="h-2.5 w-2.5 shrink-0" />
                      {isCategoryChanged ? categoryLabel : "Category"}

                      {isCategoryChanged && (
                        <span
                          role="button"
                          tabIndex={-1}
                          onMouseDown={(e) => {
                            e.stopPropagation()
                            e.preventDefault()
                            setCategory("member_concerns")
                          }}
                          className="ml-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full hover:bg-black/10 dark:hover:bg-white/20"
                        >
                          <X className="h-2.5 w-2.5" />
                        </span>
                      )}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-1" align="start">
                  {CATEGORY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setCategory(opt.value)
                        setCategoryOpen(false)
                      }}
                      className={cn(
                        "flex w-full items-center rounded-md px-2.5 py-1.5 text-[13px] transition-colors",
                        category === opt.value
                          ? "bg-accent text-accent-foreground font-medium"
                          : "text-foreground hover:bg-accent/50"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </PopoverContent>
              </Popover>

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
          {isLoading ? "Creating..." : "Create Discussion"}
        </Button>
      </ModalFormFooter>
    </ModalForm>
  )
}
