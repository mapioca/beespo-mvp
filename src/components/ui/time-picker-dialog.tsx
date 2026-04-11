"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface TimePickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  value?: string
  onSave: (value: string) => void
  title?: string
  description?: string
  saveLabel?: string
}

const QUICK_TIMES = ["18:00", "19:00", "20:00"] as const

function parseTime(value?: string): { hour12: string; minute: string; period: "AM" | "PM" } {
  if (!value) return { hour12: "9", minute: "00", period: "AM" }
  const [h, m] = value.split(":").map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return { hour12: "9", minute: "00", period: "AM" }
  const period: "AM" | "PM" = h >= 12 ? "PM" : "AM"
  const hour12 = String(((h + 11) % 12) + 1)
  return { hour12, minute: String(m).padStart(2, "0"), period }
}

function to24Hour(hour12: string, minute: string, period: "AM" | "PM"): string {
  const parsedHour = Number.parseInt(hour12, 10)
  const parsedMinute = Number.parseInt(minute, 10)
  const safeHour = Number.isFinite(parsedHour) ? Math.min(12, Math.max(1, parsedHour)) : 9
  const safeMinute = Number.isFinite(parsedMinute) ? Math.min(59, Math.max(0, parsedMinute)) : 0
  let hour = safeHour % 12
  if (period === "PM") hour += 12
  return `${String(hour).padStart(2, "0")}:${String(safeMinute).padStart(2, "0")}`
}

function formatLabel(value: string): string {
  const [h, m] = value.split(":").map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return value
  const period = h >= 12 ? "PM" : "AM"
  const hour12 = ((h + 11) % 12) + 1
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`
}

function currentRoundedTime(): string {
  const now = new Date()
  const minutes = now.getMinutes()
  const rounded = Math.ceil(minutes / 5) * 5
  if (rounded === 60) {
    now.setHours(now.getHours() + 1, 0, 0, 0)
  } else {
    now.setMinutes(rounded, 0, 0)
  }
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
}

function buildTimeOptions(stepMinutes = 15): string[] {
  const options: string[] = []
  for (let hour = 0; hour < 24; hour += 1) {
    for (let minute = 0; minute < 60; minute += stepMinutes) {
      options.push(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`)
    }
  }
  return options
}

const TIME_OPTIONS = buildTimeOptions(15)

export function TimePickerDialog({
  open,
  onOpenChange,
  value,
  onSave,
  title = "Set time",
  description = "Choose a time or leave it as TBD.",
  saveLabel = "Save time",
}: TimePickerDialogProps) {
  const [stagedTime, setStagedTime] = React.useState("09:00")
  const [hour12, setHour12] = React.useState("9")
  const [minute, setMinute] = React.useState("00")
  const [period, setPeriod] = React.useState<"AM" | "PM">("AM")
  const [showCustom, setShowCustom] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    const next = value || "09:00"
    const parsed = parseTime(next)
    setStagedTime(next)
    setHour12(parsed.hour12)
    setMinute(parsed.minute)
    setPeriod(parsed.period)
    setShowCustom(false)
  }, [open, value])

  const updateFromCustom = React.useCallback(
    (nextHour12: string, nextMinute: string, nextPeriod: "AM" | "PM") => {
      const next = to24Hour(nextHour12, nextMinute, nextPeriod)
      setHour12(nextHour12)
      setMinute(nextMinute)
      setPeriod(nextPeriod)
      setStagedTime(next)
    },
    []
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 p-0">
        <DialogHeader className="space-y-1 px-6 pt-5 pb-4">
          <DialogTitle className="text-base font-semibold tracking-tight">{title}</DialogTitle>
          <DialogDescription className="text-[13px] leading-snug text-muted-foreground">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 px-6 pb-4">
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Time</span>
            <Select
              value={stagedTime}
              onValueChange={(next) => {
                setStagedTime(next)
                const parsed = parseTime(next)
                setHour12(parsed.hour12)
                setMinute(parsed.minute)
                setPeriod(parsed.period)
              }}
            >
              <SelectTrigger className="h-9 w-full sm:w-[220px]">
                <SelectValue placeholder="Select time">{formatLabel(stagedTime)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {TIME_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {formatLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 rounded-full px-2.5 text-[11px]"
              onClick={() => {
                const next = currentRoundedTime()
                setStagedTime(next)
                const parsed = parseTime(next)
                setHour12(parsed.hour12)
                setMinute(parsed.minute)
                setPeriod(parsed.period)
              }}
            >
              Now
            </Button>
            {QUICK_TIMES.map((quick) => (
              <Button
                key={quick}
                type="button"
                variant="outline"
                size="sm"
                className="h-7 rounded-full px-2.5 text-[11px]"
                onClick={() => {
                  setStagedTime(quick)
                  const parsed = parseTime(quick)
                  setHour12(parsed.hour12)
                  setMinute(parsed.minute)
                  setPeriod(parsed.period)
                }}
              >
                {formatLabel(quick)}
              </Button>
            ))}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-0 text-[11px] text-muted-foreground hover:text-foreground"
            onClick={() => setShowCustom((prev) => !prev)}
          >
            {showCustom ? "Hide custom controls" : "Custom time"}
          </Button>

          {showCustom && (
            <div className="grid grid-cols-[1fr_1fr_auto] gap-2 rounded-md border border-border/70 p-2">
              <Select value={hour12} onValueChange={(nextHour12) => updateFromCustom(nextHour12, minute, period)}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Hour" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((h) => (
                    <SelectItem key={h} value={h}>
                      {h}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={minute} onValueChange={(nextMinute) => updateFromCustom(hour12, nextMinute, period)}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Minute" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0")).map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="inline-flex rounded-md border border-input p-0.5">
                {(["AM", "PM"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => updateFromCustom(hour12, minute, option)}
                    className={cn(
                      "h-7 min-w-[46px] rounded-sm px-2 text-xs font-medium transition-colors",
                      period === option
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 border-t px-6 py-3">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="h-8 rounded-full px-3 text-xs">
            Cancel
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              onSave("")
              onOpenChange(false)
            }}
            className="h-8 rounded-full px-3 text-xs"
          >
            Clear
          </Button>
          <Button
            type="button"
            onClick={() => {
              onSave(stagedTime)
              onOpenChange(false)
            }}
            className="h-8 rounded-full px-3 text-xs"
          >
            {saveLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
