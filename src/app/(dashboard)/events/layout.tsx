import { Metadata } from "next"
import { CalendarHubShell } from "@/components/calendar/hub"

export const metadata: Metadata = {
    title: "Events | Beespo",
}

interface EventsLayoutProps {
    children: React.ReactNode
}

export default function EventsLayout({ children }: EventsLayoutProps) {
    return <CalendarHubShell>{children}</CalendarHubShell>
}
