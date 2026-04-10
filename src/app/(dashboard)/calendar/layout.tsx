import { Metadata } from "next"
import { CalendarHubShell } from "@/components/calendar/hub"

export const metadata: Metadata = {
    title: "Schedule | Beespo",
    description: "Your schedule, events, and calendar settings hub",
}

interface CalendarLayoutProps {
    children: React.ReactNode
}

export default function CalendarLayout({ children }: CalendarLayoutProps) {
    return <CalendarHubShell>{children}</CalendarHubShell>
}
