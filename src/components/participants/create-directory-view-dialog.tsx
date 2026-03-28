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
import {
  createDirectoryView,
  DirectoryView,
  DirectoryViewFilters,
} from "@/lib/directory-views"
import { toast } from "@/lib/toast"
import type { DirectoryTag } from "@/types/database"

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

// ── Props ─────────────────────────────────────────────────────────────────────

interface CreateDirectoryViewDialogProps {
  workspaceTags: DirectoryTag[]
  onCreated: (view: DirectoryView) => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CreateDirectoryViewDialog({
  workspaceTags,
  onCreated,
}: CreateDirectoryViewDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Form state
  const [name, setName] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [includeUntagged, setIncludeUntagged] = useState(false)
  const [speakerOp, setSpeakerOp] = useState<
    "any" | "none" | "date" | ""
  >("")
  
  // Date builder state
  const [dateModifier, setDateModifier] = useState<"is" | "is_not">("is")
  const [dateDirection, setDateDirection] = useState<"after" | "before">("after")


  const [speakerDate, setSpeakerDate] = useState("")
  const [speakerConfirmed, setSpeakerConfirmed] = useState<
    "confirmed" | "pending" | "any"
  >("any")
  const [historyFilter, setHistoryFilter] = useState<
    "has_history" | "no_history" | ""
  >("")

  function reset() {
    setName("")
    setSelectedTags([])
    setIncludeUntagged(false)
    setSpeakerOp("")
    setDateModifier("is")
    setDateDirection("after")
    setSpeakerDate("")
    setSpeakerConfirmed("any")
    setHistoryFilter("")
  }

  function toggleTag(id: string) {
    setSelectedTags((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    const tags = [
      ...(includeUntagged ? ["untagged"] : []),
      ...selectedTags,
    ]

    let finalSpeakerOp: DirectoryViewFilters["speakerDateOperator"] | undefined = undefined;

    if (speakerOp === "date") {
      if (dateModifier === "is" && dateDirection === "after") finalSpeakerOp = "after"
      else if (dateModifier === "is_not" && dateDirection === "after") finalSpeakerOp = "not_after" // is not after -> on or before
      else if (dateModifier === "is" && dateDirection === "before") finalSpeakerOp = "before"
      else if (dateModifier === "is_not" && dateDirection === "before") finalSpeakerOp = "not_before" // is not before -> on or after
    } else if (speakerOp === "any" || speakerOp === "none") {
      finalSpeakerOp = speakerOp
    }

    const filters: DirectoryViewFilters = {
      ...(tags.length > 0 && { tagIds: tags }),
      ...(finalSpeakerOp && {
        speakerDateOperator: finalSpeakerOp,
        ...(speakerDate &&
          speakerOp === "date" && {
            speakerDateValue: speakerDate,
          }),
        ...(finalSpeakerOp !== "none" &&
          speakerConfirmed !== "any" && {
            speakerConfirmed,
          }),
      }),
      ...(historyFilter && { historyFilter: historyFilter as DirectoryViewFilters["historyFilter"] }),
    }

    startTransition(async () => {
      const result = await createDirectoryView(name.trim(), filters)
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

  const needsDate = speakerOp === "date"
  const showConfirmation = speakerOp === "date" || speakerOp === "any"

  return (
    <>
      {/* Trigger */}
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
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create a directory view</DialogTitle>
            <DialogDescription>
              Define a saved filter for the directory. All workspace members will see this view.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 mt-1">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="dv-name">View name</Label>
              <Input
                id="dv-name"
                placeholder="e.g. Upcoming Speakers"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>

            {/* Tags */}
            <div>
              <SectionLabel>
                Tags{" "}
                <span className="normal-case font-normal">(optional)</span>
              </SectionLabel>
              <div className="flex flex-wrap gap-2">
                <ToggleChip
                  active={includeUntagged}
                  onClick={() => setIncludeUntagged((v) => !v)}
                >
                  Untagged
                </ToggleChip>
                {workspaceTags.map((tag) => (
                  <ToggleChip
                    key={tag.id}
                    active={selectedTags.includes(tag.id)}
                    onClick={() => toggleTag(tag.id)}
                  >
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: tag.color }}
                    />
                    {tag.name}
                  </ToggleChip>
                ))}
              </div>
            </div>

            {/* Assignments */}
            <div>
              <SectionLabel>Assignments</SectionLabel>
              <div className="flex flex-wrap gap-2 mb-3">
                {(
                  [
                    { value: "", label: "Any (no filter)" },
                    { value: "any", label: "Has speaker assignment" },
                    { value: "none", label: "No speaker assignments" },
                    { value: "date", label: "Speaker assignment date…" },
                  ] as const
                ).map(({ value, label }) => (
                  <ToggleChip
                    key={value}
                    active={speakerOp === value}
                    onClick={() => setSpeakerOp(value)}
                  >
                    {label}
                  </ToggleChip>
                ))}
              </div>

              {/* Date builder — shown only when 'date' is selected */}
              {speakerOp === "date" && (
                <div className="space-y-3 mt-3 p-3 bg-muted/30 rounded-lg shrink-0 border border-border/50">
                  <div className="flex items-center flex-wrap gap-3">
                    <span className="text-sm font-medium">Speaker assignment date</span>
                    <div className="flex bg-background rounded-md border p-0.5">
                      <button
                        type="button"
                        onClick={() => setDateModifier("is")}
                        className={cn("px-2.5 py-1 text-xs font-medium rounded-sm", dateModifier === "is" ? "bg-muted shadow-sm" : "hover:bg-muted/50")}
                      >
                        is
                      </button>
                      <button
                        type="button"
                        onClick={() => setDateModifier("is_not")}
                        className={cn("px-2.5 py-1 text-xs font-medium rounded-sm", dateModifier === "is_not" ? "bg-muted shadow-sm" : "hover:bg-muted/50")}
                      >
                        is not
                      </button>
                    </div>
                    
                    <div className="flex bg-background rounded-md border p-0.5">
                      <button
                        type="button"
                        onClick={() => setDateDirection("after")}
                        className={cn("px-2.5 py-1 text-xs font-medium rounded-sm", dateDirection === "after" ? "bg-muted shadow-sm" : "hover:bg-muted/50")}
                      >
                        after
                      </button>
                      <button
                        type="button"
                        onClick={() => setDateDirection("before")}
                        className={cn("px-2.5 py-1 text-xs font-medium rounded-sm", dateDirection === "before" ? "bg-muted shadow-sm" : "hover:bg-muted/50")}
                      >
                        before
                      </button>
                    </div>
                  </div>
                  
                  <Input
                    type="date"
                    className="w-full sm:w-[200px] bg-background"
                    value={speakerDate}
                    onChange={(e) => setSpeakerDate(e.target.value)}
                    required
                  />
                </div>
              )}

              {/* Confirmation status */}
              {showConfirmation && (
                <div className="mt-3">
                  <SectionLabel>
                    Assignment status{" "}
                    <span className="normal-case font-normal">(optional)</span>
                  </SectionLabel>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        { value: "any", label: "Any" },
                        { value: "confirmed", label: "✓ Confirmed" },
                        { value: "pending", label: "⏳ Pending" },
                      ] as const
                    ).map(({ value, label }) => (
                      <ToggleChip
                        key={value}
                        active={speakerConfirmed === value}
                        onClick={() => setSpeakerConfirmed(value)}
                      >
                        {label}
                      </ToggleChip>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Meeting history */}
            <div>
              <SectionLabel>
                Meeting history{" "}
                <span className="normal-case font-normal">(optional)</span>
              </SectionLabel>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { value: "", label: "Any (no filter)" },
                    { value: "has_history", label: "Has been in a meeting" },
                    { value: "no_history", label: "Never in a meeting" },
                  ] as const
                ).map(({ value, label }) => (
                  <ToggleChip
                    key={value}
                    active={historyFilter === value}
                    onClick={() => setHistoryFilter(value)}
                  >
                    {label}
                  </ToggleChip>
                ))}
              </div>
            </div>

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
              <Button
                type="submit"
                disabled={
                  !name.trim() ||
                  isPending ||
                  (needsDate && !speakerDate)
                }
              >
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
