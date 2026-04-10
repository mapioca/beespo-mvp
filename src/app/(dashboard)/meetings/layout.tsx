import { Metadata } from "next"
import { MeetingsHubShell } from "@/components/meetings/hub"

export const metadata: Metadata = {
  title: "Meetings | Beespo",
  description: "Your central workspace for meetings, plans, assignments, and announcements",
}

interface MeetingsLayoutProps {
  children: React.ReactNode
}

export default function MeetingsLayout({ children }: MeetingsLayoutProps) {
  return <MeetingsHubShell>{children}</MeetingsHubShell>
}
