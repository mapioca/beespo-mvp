"use client"

import { DomainShell } from "@/components/domain/domain-shell"

import { scheduleNavItems } from "./schedule-nav"

interface CalendarHubShellProps {
    children: React.ReactNode
}

export function CalendarHubShell({ children }: CalendarHubShellProps) {
    return (
        <DomainShell title="Schedule" navLabel="Schedule navigation" items={scheduleNavItems}>
            {children}
        </DomainShell>
    )
}
