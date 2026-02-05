import { Metadata } from "next"
import { OverviewContent } from "@/components/meetings/hub/overview"

export const metadata: Metadata = {
  title: "Meetings Hub | Beespo",
  description: "Your central workspace for managing meetings and agendas",
}

export default function MeetingsOverviewPage() {
  return <OverviewContent />
}
