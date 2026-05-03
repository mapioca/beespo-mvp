import { DataHubShell } from "@/components/data/hub"

interface FormsLayoutProps {
  children: React.ReactNode
}

export default function FormsLayout({ children }: FormsLayoutProps) {
  return <DataHubShell>{children}</DataHubShell>
}
