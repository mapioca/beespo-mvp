"use client"

import { DomainShell } from "@/components/domain/domain-shell"
import { getMeetingsNavItems } from "./meetings-nav"

interface MeetingsHubShellProps {
  children: React.ReactNode
  isBishopric: boolean
}

export function MeetingsHubShell({ children, isBishopric }: MeetingsHubShellProps) {
  return (
    <DomainShell
      title="Meetings"
      navLabel="Meetings navigation"
      items={getMeetingsNavItems(isBishopric)}
      singleExpandedGroup
    >
      {children}
    </DomainShell>
  )
}
