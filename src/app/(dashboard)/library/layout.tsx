import { TemplatesHubShell } from "@/components/templates/hub"

interface TemplatesLayoutProps {
  children: React.ReactNode
}

export default function TemplatesLayout({ children }: TemplatesLayoutProps) {
  return <TemplatesHubShell>{children}</TemplatesHubShell>
}
