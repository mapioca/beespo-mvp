"use client"

import { HubTabs } from "./hub-tabs"

interface MeetingsHubShellProps {
  children: React.ReactNode
}

export function MeetingsHubShell({ children }: MeetingsHubShellProps) {
  return (
    <div className="flex flex-col h-full">
      <HubTabs />
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  )
}
