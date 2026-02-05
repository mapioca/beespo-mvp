import { CalendarDays, Briefcase, Megaphone, MessageSquare } from "lucide-react"
import { PlaceholderWidget } from "./placeholder-widget"
import { WidgetGrid } from "./widget-grid"

export function OverviewContent() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Meetings Hub</h1>
        <p className="text-muted-foreground">
          Your central workspace for managing meetings, agendas, and related content.
        </p>
      </div>

      <WidgetGrid>
        <PlaceholderWidget
          title="Upcoming Meetings"
          icon={CalendarDays}
          href="/meetings/schedule"
          description="View and manage your scheduled meetings, track status, and prepare agendas."
        />
        <PlaceholderWidget
          title="Business Items"
          icon={Briefcase}
          href="/meetings/business"
          description="Track releases, sustainings, and other business matters for your organization."
        />
        <PlaceholderWidget
          title="Announcements"
          icon={Megaphone}
          href="/meetings/announcements"
          description="Manage time-based announcements and important communications."
        />
        <PlaceholderWidget
          title="Discussions"
          icon={MessageSquare}
          href="/meetings/discussions"
          description="Track ongoing topics, decisions, and discussion items."
        />
      </WidgetGrid>
    </div>
  )
}
