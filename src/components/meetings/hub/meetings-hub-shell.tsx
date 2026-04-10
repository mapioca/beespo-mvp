"use client"

import { DomainShell } from "@/components/domain/domain-shell"

import { meetingsNavItems } from "./meetings-nav"

interface MeetingsHubShellProps {
  children: React.ReactNode
}

export function MeetingsHubShell({ children }: MeetingsHubShellProps) {
  return (
    <DomainShell title="Meetings" navLabel="Meetings navigation" items={meetingsNavItems}>
      {children}
    </DomainShell>
  )
}
