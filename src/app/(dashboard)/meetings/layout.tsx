import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Meetings | Beespo",
  description: "Plan, organize, and archive your sacrament meetings.",
}

export default function MeetingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
