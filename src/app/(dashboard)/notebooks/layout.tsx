import { DataHubShell } from "@/components/data/hub"

interface NotebooksLayoutProps {
  children: React.ReactNode
}

export default function NotebooksLayout({ children }: NotebooksLayoutProps) {
  return <DataHubShell>{children}</DataHubShell>
}
