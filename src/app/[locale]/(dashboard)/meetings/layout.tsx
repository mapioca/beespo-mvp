import { Metadata } from "next"
import { MeetingsHubShell } from "@/components/meetings/hub"

export const metadata: Metadata = {
  title: "Meetings Hub | Beespo",
  description: "Your central workspace for managing meetings and agendas",
}

interface MeetingsLayoutProps {
  children: React.ReactNode
}

export default function MeetingsLayout({ children }: MeetingsLayoutProps) {
  return <MeetingsHubShell>{children}</MeetingsHubShell>
}
