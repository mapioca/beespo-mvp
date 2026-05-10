"use client"

import { useEffect, useState } from "react"
import { Check, CircleDashed, Info, Pencil, RotateCcw, XCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import type { AssignmentStatus, AssignmentStatusChange } from "@/lib/sacrament-confirmations"

interface AssignmentStatusPillProps {
  status: AssignmentStatus | undefined
  declineNote?: string | null
  onChange: (change: AssignmentStatusChange) => void
  // When false, pill is read-only (no popover). Used when no name is assigned.
  interactive?: boolean
}

export function AssignmentStatusPill({
  status,
  declineNote,
  onChange,
  interactive = true,
}: AssignmentStatusPillProps) {
  const [open, setOpen] = useState(false)
  const [declineDraft, setDeclineDraft] = useState(declineNote ?? "")
  const [showDeclineForm, setShowDeclineForm] = useState(false)
  const [showNotePopover, setShowNotePopover] = useState(false)

  // Sync draft with note when popover opens
  useEffect(() => {
    if (open) {
      setDeclineDraft(declineNote ?? "")
      setShowDeclineForm(false)
    }
  }, [open, declineNote])

  if (!status) return null

  const labelByStatus: Record<AssignmentStatus, string> = {
    pending: "Pending",
    confirmed: "Confirmed",
    declined: "Declined",
  }

  const styleByStatus: Record<AssignmentStatus, string> = {
    pending:
      "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
    confirmed:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
    declined:
      "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300",
  }

  const iconByStatus: Record<AssignmentStatus, React.ReactNode> = {
    pending: <CircleDashed className="h-3 w-3" />,
    confirmed: <Check className="h-3 w-3" />,
    declined: <XCircle className="h-3 w-3" />,
  }

  const pill = (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-medium leading-none",
        styleByStatus[status],
        interactive && "cursor-pointer transition-opacity hover:opacity-80"
      )}
    >
      {iconByStatus[status]}
      {labelByStatus[status]}
    </span>
  )

  const noteIcon =
    status === "declined" && declineNote?.trim() ? (
      <Popover open={showNotePopover} onOpenChange={setShowNotePopover}>
        <PopoverTrigger asChild>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              setShowNotePopover((value) => !value)
            }}
            aria-label="View decline note"
            className="grid h-5 w-5 place-items-center rounded-full text-rose-700 transition-colors hover:bg-rose-100 dark:text-rose-300 dark:hover:bg-rose-900/40"
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align="end"
          className="w-64 p-3 text-[12.5px] leading-5 text-foreground"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Decline note
          </div>
          <p className="whitespace-pre-line">{declineNote}</p>
        </PopoverContent>
      </Popover>
    ) : null

  if (!interactive) {
    return (
      <span className="inline-flex items-center gap-1.5">
        {pill}
        {noteIcon}
      </span>
    )
  }

  const handleConfirm = () => {
    onChange({ status: "confirmed" })
    setOpen(false)
  }

  const handleReset = () => {
    onChange({ status: "pending" })
    setOpen(false)
  }

  const handleDeclineSave = () => {
    const trimmed = declineDraft.trim()
    onChange({ status: "declined", declineNote: trimmed.length > 0 ? trimmed : null })
    setOpen(false)
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            onClick={(event) => event.stopPropagation()}
            aria-label={`Assignment status: ${labelByStatus[status]}. Tap to change.`}
            className="inline-flex"
          >
            {pill}
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="bottom"
          align="end"
          className="w-60 p-1"
          onClick={(event) => event.stopPropagation()}
        >
          {showDeclineForm ? (
            <div className="space-y-2 p-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Why? — optional
              </div>
              <textarea
                autoFocus
                value={declineDraft}
                onChange={(event) => setDeclineDraft(event.target.value)}
                maxLength={280}
                rows={3}
                placeholder="Going through a difficult time, prefers not to speak right now…"
                className="w-full resize-none rounded-md border border-border bg-background px-2 py-1.5 text-[12.5px] leading-5 text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
              />
              <div className="flex items-center justify-end gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-[12px]"
                  onClick={() => setShowDeclineForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-7 px-2.5 text-[12px]"
                  onClick={handleDeclineSave}
                >
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col">
              {status !== "confirmed" && (
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-left text-[13px] text-foreground transition-colors hover:bg-accent"
                >
                  <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  Mark as confirmed
                </button>
              )}
              {status !== "declined" && (
                <button
                  type="button"
                  onClick={() => setShowDeclineForm(true)}
                  className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-left text-[13px] text-foreground transition-colors hover:bg-accent"
                >
                  <XCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                  Mark as declined…
                </button>
              )}
              {status === "declined" && declineNote?.trim() && (
                <button
                  type="button"
                  onClick={() => setShowDeclineForm(true)}
                  className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-left text-[13px] text-foreground transition-colors hover:bg-accent"
                >
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  Edit decline note
                </button>
              )}
              {status !== "pending" && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-left text-[13px] text-foreground transition-colors hover:bg-accent"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
                  Reset to pending
                </button>
              )}
            </div>
          )}
        </PopoverContent>
      </Popover>
      {noteIcon}
    </span>
  )
}
