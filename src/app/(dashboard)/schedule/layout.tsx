import { Metadata } from "next"
import { CalendarHubShell } from "@/components/calendar/hub"

export const metadata: Metadata = {
    title: "Schedule | Beespo",
    description: "Your schedule, events, and calendar settings hub",
}

interface ScheduleLayoutProps {
    children: React.ReactNode
}

export default function ScheduleLayout({ children }: ScheduleLayoutProps) {
    return <CalendarHubShell>{children}</CalendarHubShell>
}
