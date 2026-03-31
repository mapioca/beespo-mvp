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
import { toast } from "@/lib/toast"
import { TableView } from "@/lib/table-views"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ViewFilterSection {
  /** Section heading displayed above the chips */
  sectionLabel: string
  /** Key used in the filters object */
  key: string
  /** The available options for this filter */
  options: Array<{ value: string; label: string }>
  /** If true the section is optional and the label is suffixed with "(optional)" */
  optional?: boolean
}

interface CreateViewDialogProps {
  filterSections: ViewFilterSection[]
  /** Called with (name, filters) — should call the appropriate server action */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSave: (name: string, filters: Record<string, string[]>) => Promise<{ data?: any; error?: string }>
  /** Called with the newly created view after a successful save */
  onCreated: (view: TableView) => void
}

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
          ? "bg-stone-200 text-foreground border-stone-200 shadow-sm"
          : "text-muted-foreground border-border hover:bg-stone-100 hover:text-foreground hover:border-foreground/20"
      )}
    >
      {active && <Check className="h-3 w-3" />}
      {children}
    </button>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CreateViewDialog({
  filterSections,
  onSave,
  onCreated,
}: CreateViewDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [name, setName] = useState("")
  // Map of key → selected values
  const [selections, setSelections] = useState<Record<string, string[]>>({})

  function reset() {
    setName("")
    setSelections({})
  }

  function toggle(key: string, value: string) {
    setSelections((prev) => {
      const current = prev[key] ?? []
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value]
      return { ...prev, [key]: next }
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    // Build filters: only include keys with at least one selected value
    const filters: Record<string, string[]> = {}
    for (const section of filterSections) {
      const vals = selections[section.key] ?? []
      if (vals.length > 0) filters[section.key] = vals
    }

    startTransition(async () => {
      const result = await onSave(name.trim(), filters)
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
                placeholder="e.g. High Priority Items"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>

            {/* Dynamic filter sections */}
            {filterSections.map((section) => (
              <div key={section.key}>
                <SectionLabel>
                  {section.sectionLabel}
                  {section.optional && (
                    <span className="normal-case font-normal"> (optional — leave empty for all)</span>
                  )}
                </SectionLabel>
                <div className="flex flex-wrap gap-2">
                  {section.options.map(({ value, label }) => (
                    <ToggleChip
                      key={value}
                      active={(selections[section.key] ?? []).includes(value)}
                      onClick={() => toggle(section.key, value)}
                    >
                      {label}
                    </ToggleChip>
                  ))}
                </div>
              </div>
            ))}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOpen(false)
                  reset()
                }}
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
