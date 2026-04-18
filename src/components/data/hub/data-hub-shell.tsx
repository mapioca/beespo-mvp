"use client"

import { DomainShell } from "@/components/domain/domain-shell"

import { dataNavItems } from "./data-nav"

interface DataHubShellProps {
  children: React.ReactNode
}

export function DataHubShell({ children }: DataHubShellProps) {
  return (
    <DomainShell title="Data" navLabel="Data navigation" items={dataNavItems}>
      {children}
    </DomainShell>
  )
}
