import { DataHubShell } from "@/components/data/hub"

interface TablesLayoutProps {
  children: React.ReactNode
}

export default function TablesLayout({ children }: TablesLayoutProps) {
  return <DataHubShell>{children}</DataHubShell>
}
