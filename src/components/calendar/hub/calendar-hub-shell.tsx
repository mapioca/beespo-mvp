"use client"

import { CalendarTabs } from "./calendar-tabs"

interface CalendarHubShellProps {
    children: React.ReactNode
}

export function CalendarHubShell({ children }: CalendarHubShellProps) {
    return (
        <div className="flex flex-col h-full">
            <CalendarTabs />
            <div className="flex-1 overflow-auto">{children}</div>
        </div>
    )
}
