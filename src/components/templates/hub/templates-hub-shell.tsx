"use client"

import { DomainShell } from "@/components/domain/domain-shell"

import { templatesNavItems } from "./templates-nav"

interface TemplatesHubShellProps {
  children: React.ReactNode
}

export function TemplatesHubShell({ children }: TemplatesHubShellProps) {
  return (
    <DomainShell title="Templates" navLabel="Templates navigation" items={templatesNavItems}>
      {children}
    </DomainShell>
  )
}
