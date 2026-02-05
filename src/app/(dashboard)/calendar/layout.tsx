import { Metadata } from "next"
import { CalendarHubShell } from "@/components/calendar/hub"

export const metadata: Metadata = {
    title: "Calendar | Beespo",
    description: "Your calendar and events hub",
}

interface CalendarLayoutProps {
    children: React.ReactNode
}

export default function CalendarLayout({ children }: CalendarLayoutProps) {
    return <CalendarHubShell>{children}</CalendarHubShell>
}
