"use client"

import { useState, useTransition } from "react"
import { Grid2x2Plus, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { createAgendaView, AgendaView, ViewFilters } from "@/lib/agenda-views"
import { toast } from "@/lib/toast"
import { Template } from "./meetings-table"

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORY_OPTIONS = [
  { value: "mine", label: "My Meetings" },
  { value: "shared", label: "Shared with Me" },
  { value: "all", label: "All" },
] as const

const STATUS_OPTIONS = [
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
      {children}
    </p>
  )
}

function ToggleChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-foreground text-background border-foreground"
          : "text-muted-foreground border-border hover:text-foreground hover:border-foreground/40"
      )}
    >
      {active && <Check className="h-3 w-3" />}
      {children}
    </button>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface CreateViewDialogProps {
  templates: Template[]
  onCreated: (view: AgendaView) => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CreateViewDialog({ templates, onCreated }: CreateViewDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Form state
  const [name, setName] = useState("")
  const [category, setCategory] = useState<"mine" | "shared" | "all">("all")
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([])
  const [hasZoom, setHasZoom] = useState(false)

  function reset() {
    setName("")
    setCategory("all")
    setSelectedStatuses([])
    setSelectedTemplates([])
    setHasZoom(false)
  }

  function toggleStatus(value: string) {
    setSelectedStatuses((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]
    )
  }

  function toggleTemplate(value: string) {
    setSelectedTemplates((prev) =>
      prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    const filters: ViewFilters = {
      category,
      ...(selectedStatuses.length > 0 && { statuses: selectedStatuses }),
      ...(selectedTemplates.length > 0 && { templateIds: selectedTemplates }),
      ...(hasZoom && { hasZoom: true }),
    }

    startTransition(async () => {
      const result = await createAgendaView(name.trim(), filters)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(`View "${name.trim()}" created`)
      onCreated(result.data!)
      reset()
      setOpen(false)
    })
  }

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Create a view"
        className={cn(
          "flex items-center justify-center rounded-full h-[30px] w-[30px] border border-border",
          "text-muted-foreground hover:text-foreground hover:border-foreground/40",
          "transition-colors shrink-0"
        )}
      >
        <Grid2x2Plus className="h-3.5 w-3.5" />
        <span className="sr-only">Create a view</span>
      </button>

      {/* Dialog */}
      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (!isPending) {
            setOpen(o)
            if (!o) reset()
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create a view</DialogTitle>
            <DialogDescription>
              Define a reusable filter. All members of your workspace will see this view.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 mt-1">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="view-name">View name</Label>
              <Input
                id="view-name"
                placeholder="e.g. Youth Council Agendas"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>

            {/* Category */}
            <div>
              <SectionLabel>Show meetings from</SectionLabel>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_OPTIONS.map(({ value, label }) => (
                  <ToggleChip
                    key={value}
                    active={category === value}
                    onClick={() => setCategory(value)}
                  >
                    {label}
                  </ToggleChip>
                ))}
              </div>
            </div>

            {/* Status */}
            <div>
              <SectionLabel>Status <span className="normal-case font-normal">(optional — leave empty for all)</span></SectionLabel>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map(({ value, label }) => (
                  <ToggleChip
                    key={value}
                    active={selectedStatuses.includes(value)}
                    onClick={() => toggleStatus(value)}
                  >
                    {label}
                  </ToggleChip>
                ))}
              </div>
            </div>

            {/* Template */}
            {templates.length > 0 && (
              <div>
                <SectionLabel>Template <span className="normal-case font-normal">(optional)</span></SectionLabel>
                <div className="flex flex-wrap gap-2">
                  <ToggleChip
                    active={selectedTemplates.includes("no-template")}
                    onClick={() => toggleTemplate("no-template")}
                  >
                    No Template
                  </ToggleChip>
                  {templates.map((t) => (
                    <ToggleChip
                      key={t.id}
                      active={selectedTemplates.includes(t.id)}
                      onClick={() => toggleTemplate(t.id)}
                    >
                      {t.name}
                    </ToggleChip>
                  ))}
                </div>
              </div>
            )}

            {/* Zoom */}
            <div>
              <SectionLabel>Other filters</SectionLabel>
              <ToggleChip active={hasZoom} onClick={() => setHasZoom((v) => !v)}>
                🎥 Has Zoom meeting
              </ToggleChip>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => { setOpen(false); reset() }}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!name.trim() || isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Creating…
                  </>
                ) : (
                  "Create view"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
