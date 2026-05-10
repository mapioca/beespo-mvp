"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { format } from "date-fns"
import { Check, MoreHorizontal, RotateCcw, UserMinus, XCircle } from "lucide-react"

import { Breadcrumbs } from "@/components/dashboard/breadcrumbs"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import {
  describeAssignmentRole,
  type ConfirmationAction,
  type ConfirmationAssignment,
} from "@/lib/sacrament-confirmations"

interface ConfirmationsClientProps {
  initialAssignments: ConfirmationAssignment[]
  upcomingDates: string[]
}

type RowStateMap = Record<string, "idle" | "saving" | "error">

function rowKey(meetingDate: string, entryId: string) {
  return `${meetingDate}::${entryId}`
}

function formatMeetingHeading(isoDate: string): string {
  try {
    return format(new Date(`${isoDate}T12:00:00`), "EEEE, MMMM d")
  } catch {
    return isoDate
  }
}

function formatRecentDate(isoDate: string): string {
  try {
    return format(new Date(`${isoDate}T12:00:00`), "MMM d")
  } catch {
    return isoDate
  }
}

export function ConfirmationsClient({
  initialAssignments,
  upcomingDates,
}: ConfirmationsClientProps) {
  const [assignments, setAssignments] = useState<ConfirmationAssignment[]>(initialAssignments)
  const [rowState, setRowState] = useState<RowStateMap>({})

  const upcomingDateSet = useMemo(() => new Set(upcomingDates), [upcomingDates])

  const pendingByDate = useMemo(() => {
    const groups = new Map<string, ConfirmationAssignment[]>()
    for (const assignment of assignments) {
      if (assignment.status !== "pending") continue
      if (!upcomingDateSet.has(assignment.meetingDate)) continue
      const list = groups.get(assignment.meetingDate) ?? []
      list.push(assignment)
      groups.set(assignment.meetingDate, list)
    }
    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, items]) => ({ date, items }))
  }, [assignments, upcomingDateSet])

  const recentlyDeclined = useMemo(() => {
    return assignments
      .filter((assignment) => assignment.status === "declined")
      .sort((a, b) => {
        const ad = a.declinedAt ?? ""
        const bd = b.declinedAt ?? ""
        return bd.localeCompare(ad)
      })
  }, [assignments])

  const totalPending = pendingByDate.reduce((sum, group) => sum + group.items.length, 0)

  const applyLocalAction = (
    meetingDate: string,
    entryId: string,
    action: ConfirmationAction
  ) => {
    setAssignments((current) =>
      current
        .map((item) => {
          if (item.meetingDate !== meetingDate || item.entryId !== entryId) return item
          if (action.type === "unassign") return null
          if (action.type === "confirm") {
            return { ...item, status: "confirmed", declineNote: null, declinedAt: null }
          }
          if (action.type === "reset") {
            return { ...item, status: "pending", declineNote: null, declinedAt: null }
          }
          // decline
          return {
            ...item,
            status: "declined",
            declineNote: action.note,
            declinedAt: new Date().toISOString(),
          }
        })
        .filter((item): item is ConfirmationAssignment => item !== null)
    )
  }

  const runAction = async (
    meetingDate: string,
    entryId: string,
    action: ConfirmationAction
  ) => {
    const key = rowKey(meetingDate, entryId)
    const previous = assignments
    setRowState((state) => ({ ...state, [key]: "saving" }))
    applyLocalAction(meetingDate, entryId, action)
    try {
      const response = await fetch("/api/meetings/sacrament-confirmations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingDate, entryId, action }),
      })
      if (!response.ok) throw new Error(await response.text())
      setRowState((state) => {
        const next = { ...state }
        delete next[key]
        return next
      })
    } catch {
      setAssignments(previous)
      setRowState((state) => ({ ...state, [key]: "error" }))
    }
  }

  return (
    <div className="min-h-full bg-surface-canvas dark:bg-card">
      <Breadcrumbs className="bg-surface-canvas" />
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <header>
          <h1 className="font-serif text-[24px] tracking-[-0.005em] text-foreground sm:text-[28px]">
            Confirmations
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground sm:text-[14px]">
            {totalPending === 0
              ? "Everyone in the next 8 weeks is confirmed or declined."
              : `${totalPending} pending speaker${totalPending === 1 ? "" : "s"} and prayer${totalPending === 1 ? "" : "s"} to follow up on.`}
          </p>
        </header>

        {pendingByDate.length === 0 ? (
          <EmptyPendingState />
        ) : (
          <div className="flex flex-col gap-5">
            {pendingByDate.map((group) => (
              <PendingGroup
                key={group.date}
                meetingDate={group.date}
                items={group.items}
                rowState={rowState}
                onAction={runAction}
              />
            ))}
          </div>
        )}

        {recentlyDeclined.length > 0 && (
          <section>
            <div className="mb-2 flex items-center gap-3">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Recently declined
              </h2>
              <div className="h-px flex-1 bg-border/60" />
            </div>
            <p className="mb-4 text-[12.5px] leading-5 text-muted-foreground">
              Read-only history. Useful context before re-inviting someone.
            </p>
            <ul className="flex flex-col gap-2.5">
              {recentlyDeclined.map((assignment) => (
                <DeclinedRow
                  key={`${assignment.meetingDate}-${assignment.entryId}`}
                  assignment={assignment}
                  rowState={rowState}
                  onAction={runAction}
                />
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}

function EmptyPendingState() {
  return (
    <div className="rounded-2xl border border-dashed border-border/70 bg-surface-raised px-6 py-10 text-center">
      <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
        <Check className="h-5 w-5" />
      </div>
      <div className="font-serif text-[18px] text-foreground">All caught up</div>
      <p className="mt-1 text-[13px] text-muted-foreground">
        Nothing pending in the next 8 weeks. Anyone you assign in the planner shows up here automatically.
      </p>
      <div className="mt-4">
        <Button asChild variant="outline" size="sm">
          <Link href="/meetings/sacrament/planner">Open the planner</Link>
        </Button>
      </div>
    </div>
  )
}

interface PendingGroupProps {
  meetingDate: string
  items: ConfirmationAssignment[]
  rowState: RowStateMap
  onAction: (meetingDate: string, entryId: string, action: ConfirmationAction) => void
}

function PendingGroup({ meetingDate, items, rowState, onAction }: PendingGroupProps) {
  return (
    <section className="rounded-2xl border border-border/70 bg-surface-raised">
      <header className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3 sm:px-5">
        <div>
          <div className="font-serif text-[16.5px] text-foreground">
            {formatMeetingHeading(meetingDate)}
          </div>
          <div className="text-[11.5px] text-muted-foreground">
            {items.length} pending
          </div>
        </div>
        <Link
          href={`/meetings/sacrament/planner?date=${meetingDate}`}
          className="text-[11.5px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Open in planner →
        </Link>
      </header>
      <ul className="divide-y divide-border/60">
        {items.map((assignment) => (
          <PendingRow
            key={assignment.entryId}
            assignment={assignment}
            state={rowState[rowKey(meetingDate, assignment.entryId)] ?? "idle"}
            onAction={(action) => onAction(meetingDate, assignment.entryId, action)}
          />
        ))}
      </ul>
    </section>
  )
}

interface PendingRowProps {
  assignment: ConfirmationAssignment
  state: "idle" | "saving" | "error"
  onAction: (action: ConfirmationAction) => void
}

function PendingRow({ assignment, state, onAction }: PendingRowProps) {
  const [declineOpen, setDeclineOpen] = useState(false)
  const [note, setNote] = useState("")

  const handleConfirm = () => onAction({ type: "confirm" })

  const handleDecline = () => {
    const trimmed = note.trim()
    onAction({ type: "decline", note: trimmed.length > 0 ? trimmed : null })
    setNote("")
    setDeclineOpen(false)
  }

  const handleUnassign = () => onAction({ type: "unassign" })

  return (
    <li className="relative flex flex-col gap-2 px-4 py-3 sm:px-5">
      <div className="min-w-0 pr-10">
        <div className="flex items-baseline gap-2">
          <span className="font-serif text-[16px] text-foreground">{assignment.name}</span>
          {state === "saving" && (
            <span className="text-[11px] text-muted-foreground">Saving…</span>
          )}
          {state === "error" && (
            <span className="text-[11px] text-rose-600">Save failed</span>
          )}
        </div>
        <div className="mt-0.5 text-[12.5px] leading-5 text-muted-foreground">
          {describeAssignmentRole(assignment)}
          {assignment.topic ? ` · "${assignment.topic}"` : ""}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <Popover open={declineOpen} onOpenChange={setDeclineOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={state === "saving"}
              className="h-8 gap-1 px-2.5 text-[12.5px]"
            >
              <XCircle className="h-3.5 w-3.5" />
              Decline
            </Button>
          </PopoverTrigger>
          <PopoverContent side="bottom" align="start" className="w-72 p-3">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Why? — optional
            </div>
            <textarea
              autoFocus
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={280}
              rows={3}
              placeholder="Going through a difficult time, prefers not to speak right now…"
              className="w-full resize-none rounded-md border border-border bg-background px-2 py-1.5 text-[12.5px] leading-5 text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
            />
            <div className="mt-2 flex items-center justify-end gap-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-[12px]"
                onClick={() => setDeclineOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-7 px-2.5 text-[12px]"
                onClick={handleDecline}
              >
                Save decline
              </Button>
            </div>
          </PopoverContent>
        </Popover>
        <Button
          type="button"
          size="sm"
          onClick={handleConfirm}
          disabled={state === "saving"}
          className="h-8 gap-1 px-2.5 text-[12.5px]"
        >
          <Check className="h-3.5 w-3.5" />
          Confirm
        </Button>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="absolute right-2 top-2 h-8 w-8 sm:right-3 sm:top-3"
            disabled={state === "saving"}
            aria-label="More actions"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleUnassign} className="text-destructive">
            <UserMinus className="h-4 w-4" />
            Unassign
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  )
}

interface DeclinedRowProps {
  assignment: ConfirmationAssignment
  rowState: RowStateMap
  onAction: (meetingDate: string, entryId: string, action: ConfirmationAction) => void
}

function DeclinedRow({ assignment, rowState, onAction }: DeclinedRowProps) {
  const state = rowState[rowKey(assignment.meetingDate, assignment.entryId)] ?? "idle"
  const handleReset = () =>
    onAction(assignment.meetingDate, assignment.entryId, { type: "reset" })

  return (
    <li className="rounded-xl border border-border/60 bg-surface-raised px-4 py-3 sm:px-5">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
          <XCircle className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-[15.5px] text-foreground">{assignment.name}</span>
            <span className="text-[11.5px] text-muted-foreground">
              {describeAssignmentRole(assignment)} · {formatRecentDate(assignment.meetingDate)}
            </span>
          </div>
          {assignment.declineNote ? (
            <p className="mt-1 text-[12.5px] leading-5 text-muted-foreground">
              <span className="text-rose-700 dark:text-rose-300">“</span>
              {assignment.declineNote}
              <span className="text-rose-700 dark:text-rose-300">”</span>
            </p>
          ) : (
            <p className="mt-1 text-[12.5px] italic text-muted-foreground/70">No reason captured.</p>
          )}
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className={cn("h-7 gap-1 px-2 text-[11.5px]", state === "saving" && "opacity-60")}
          onClick={handleReset}
          disabled={state === "saving"}
          aria-label="Reset to pending"
        >
          <RotateCcw className="h-3 w-3" />
          Pending
        </Button>
      </div>
    </li>
  )
}

