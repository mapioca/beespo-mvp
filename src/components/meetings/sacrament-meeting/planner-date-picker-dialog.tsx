"use client"

import * as React from "react"
import { DatePickerDialog } from "@/components/ui/date-picker-dialog"

// Only Sundays keep normal foreground; all other days are muted.
const plannerDayClassName: React.ComponentProps<typeof DatePickerDialog>["dayClassName"] = ({
  iso,
  isToday,
  isSelected,
}) => {
  const isSunday = new Date(iso + "T00:00:00").getDay() === 0
  if (!isSunday && !isToday && !isSelected) return "text-muted-foreground/60"
}

export function PlannerDatePickerDialog(
  props: React.ComponentProps<typeof DatePickerDialog>
) {
  return <DatePickerDialog {...props} dayClassName={plannerDayClassName} />
}
