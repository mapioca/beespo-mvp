import type { Metadata } from "next"
import { DataHubShell } from "@/components/data/hub"

export const metadata: Metadata = {
  title: "Data | Beespo",
  description: "Browse forms, tables, and notebooks from a unified data workspace",
}

interface DataLayoutProps {
  children: React.ReactNode
}

export default function DataLayout({ children }: DataLayoutProps) {
  return <DataHubShell>{children}</DataHubShell>
}
