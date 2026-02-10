"use client"

import Link from "next/link"
import { format, isToday, isTomorrow, isThisWeek, differenceInDays } from "date-fns"
import {
  CalendarDays,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Plus,
  Briefcase,
  Megaphone,
  MessageSquare,
  FileText,
  Sparkles,
  Calendar,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface Meeting {
  id: string
  title: string
  scheduled_date: string
  status: "scheduled" | "in_progress" | "completed" | "cancelled"
  templates?: { id: string; name: string } | null
  agenda_items?: { id: string; title: string; item_type: string; participant_name: string | null }[]
}

interface PendingItem {
  id: string
  title: string
  type: "business" | "discussion" | "announcement"
  status: string
  deadline?: string | null
}

interface OverviewContentClientProps {
  nextMeeting: Meeting | null
  upcomingMeetings: Meeting[]
  pendingItems: PendingItem[]
  counts: {
    businessPending: number
    discussionsActive: number
    announcementsActive: number
  }
}

function formatMeetingDate(dateStr: string) {
  const date = new Date(dateStr)
  if (isToday(date)) return "Today"
  if (isTomorrow(date)) return "Tomorrow"
  if (isThisWeek(date)) return format(date, "EEEE")
  return format(date, "EEEE, MMM d")
}

function getReadinessScore(meeting: Meeting): { percent: number; label: string; issues: string[] } {
  const items = meeting.agenda_items || []
  if (items.length === 0) {
    return { percent: 0, label: "Empty agenda", issues: ["No agenda items added"] }
  }

  const issues: string[] = []
  const speakerItems = items.filter((i) => i.item_type === "speaker")
  const unassignedSpeakers = speakerItems.filter((i) => !i.participant_name)

  if (unassignedSpeakers.length > 0) {
    issues.push(`${unassignedSpeakers.length} speaker${unassignedSpeakers.length > 1 ? "s" : ""} unassigned`)
  }

  // Calculate a simple readiness score
  const totalSlots = Math.max(items.length, 5) // Assume minimum 5 items for a good meeting
  const filledSlots = items.length - unassignedSpeakers.length
  const percent = Math.min(100, Math.round((filledSlots / totalSlots) * 100))

  let label = "Ready"
  if (percent < 50) label = "Needs attention"
  else if (percent < 80) label = "Almost ready"

  return { percent, label, issues }
}

function getDaysUntil(dateStr: string): string {
  const days = differenceInDays(new Date(dateStr), new Date())
  if (days === 0) return "Today"
  if (days === 1) return "Tomorrow"
  if (days < 0) return "Past"
  return `${days}d`
}

export function OverviewContentClient({
  nextMeeting,
  upcomingMeetings,
  pendingItems,
  counts,
}: OverviewContentClientProps) {
  const readiness = nextMeeting ? getReadinessScore(nextMeeting) : null

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-gray-50/50">
      <div className="p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Command Center</h1>
          <p className="text-muted-foreground mt-1">
            Your meeting preparation at a glance
          </p>
        </div>

        {/* Main Grid: 65% / 35% */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          {/* LEFT COLUMN: Focus Zone */}
          <div className="space-y-6">
            {/* Hero Card: Next Meeting */}
            {nextMeeting ? (
              <Card className="bg-white shadow-sm border-0 ring-1 ring-gray-200 overflow-hidden">
                <div className="p-6 pb-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-primary uppercase tracking-wider">
                        Next Meeting
                      </p>
                      <h2 className="text-4xl font-bold text-gray-900 mt-1">
                        {formatMeetingDate(nextMeeting.scheduled_date)}
                      </h2>
                      <p className="text-xl text-gray-600 mt-1">
                        {nextMeeting.title}
                      </p>
                      {nextMeeting.templates?.name && (
                        <Badge variant="secondary" className="mt-3">
                          <FileText className="h-3 w-3 mr-1" />
                          {nextMeeting.templates.name}
                        </Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-5xl font-bold text-primary">
                        {getDaysUntil(nextMeeting.scheduled_date)}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">until meeting</p>
                    </div>
                  </div>
                </div>

                {/* Readiness Indicator */}
                {readiness && (
                  <div className="px-6 py-4 mt-4 bg-gray-50/80 border-t">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        Agenda Readiness
                      </span>
                      <span
                        className={cn(
                          "text-sm font-semibold",
                          readiness.percent >= 80
                            ? "text-green-600"
                            : readiness.percent >= 50
                              ? "text-amber-600"
                              : "text-red-600"
                        )}
                      >
                        {readiness.label}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full transition-all duration-500 rounded-full",
                          readiness.percent >= 80
                            ? "bg-green-500"
                            : readiness.percent >= 50
                              ? "bg-amber-500"
                              : "bg-red-500"
                        )}
                        style={{ width: `${readiness.percent}%` }}
                      />
                    </div>
                    {readiness.issues.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {readiness.issues.map((issue, i) => (
                          <Badge key={i} variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            {issue}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Agenda Preview */}
                <div className="px-6 py-4 border-t">
                  <p className="text-sm font-medium text-gray-500 mb-3">Agenda Preview</p>
                  {nextMeeting.agenda_items && nextMeeting.agenda_items.length > 0 ? (
                    <ul className="space-y-2">
                      {nextMeeting.agenda_items.slice(0, 4).map((item) => (
                        <li key={item.id} className="flex items-center gap-3 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                          <span className="text-gray-700">{item.title}</span>
                          {item.participant_name && (
                            <span className="text-gray-400">- {item.participant_name}</span>
                          )}
                        </li>
                      ))}
                      {nextMeeting.agenda_items.length > 4 && (
                        <li className="text-sm text-muted-foreground pl-7">
                          +{nextMeeting.agenda_items.length - 4} more items
                        </li>
                      )}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      No agenda items yet. Start building your agenda.
                    </p>
                  )}
                </div>

                {/* Action */}
                <div className="px-6 py-4 bg-gray-50/50 border-t">
                  <Button asChild size="lg" className="w-full sm:w-auto">
                    <Link href={`/meetings/${nextMeeting.id}`}>
                      Edit Agenda
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                </div>
              </Card>
            ) : (
              /* Empty State: No upcoming meetings */
              <Card className="bg-white shadow-sm border-0 ring-1 ring-gray-200">
                <CardContent className="py-16 text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Plan Your Next Quarter
                  </h3>
                  <p className="text-muted-foreground max-w-md mx-auto mb-6">
                    You have no upcoming meetings scheduled. Create your first meeting to get started with agenda planning.
                  </p>
                  <Button asChild size="lg">
                    <Link href="/meetings/new">
                      <Plus className="h-4 w-4 mr-2" />
                      Schedule First Meeting
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Planning Horizon */}
            {upcomingMeetings.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
                  Planning Horizon
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {upcomingMeetings.slice(0, 4).map((meeting) => {
                    const itemCount = meeting.agenda_items?.length || 0
                    const hasAgenda = itemCount > 0

                    return (
                      <Link
                        key={meeting.id}
                        href={`/meetings/${meeting.id}`}
                        className="group"
                      >
                        <Card className="bg-white border-0 ring-1 ring-gray-200 hover:ring-primary/50 hover:shadow-md transition-all h-full">
                          <CardContent className="p-4">
                            <p className="text-lg font-semibold text-gray-900">
                              {format(new Date(meeting.scheduled_date), "MMM d")}
                            </p>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {meeting.title}
                            </p>
                            <div className="mt-3">
                              <Badge
                                variant={hasAgenda ? "default" : "outline"}
                                className={cn(
                                  "text-xs",
                                  hasAgenda
                                    ? "bg-green-100 text-green-700 hover:bg-green-100"
                                    : "text-gray-500"
                                )}
                              >
                                {hasAgenda ? `${itemCount} items` : "Empty"}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    )
                  })}
                </div>
                {upcomingMeetings.length > 4 && (
                  <Link
                    href="/meetings/schedule"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-3"
                  >
                    View all {upcomingMeetings.length} upcoming meetings
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Pulse Zone */}
          <div className="space-y-6">
            {/* Action Inbox */}
            <Card className="bg-white shadow-sm border-0 ring-1 ring-gray-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  Action Inbox
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {pendingItems.length > 0 ? (
                  <>
                    {pendingItems.slice(0, 5).map((item) => (
                      <Link
                        key={item.id}
                        href={`/meetings/${item.type === "business" ? "business" : item.type === "discussion" ? "discussions" : "announcements"}`}
                        className="flex items-start gap-3 p-3 -mx-3 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div
                          className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                            item.type === "business"
                              ? "bg-blue-100 text-blue-600"
                              : item.type === "discussion"
                                ? "bg-purple-100 text-purple-600"
                                : "bg-amber-100 text-amber-600"
                          )}
                        >
                          {item.type === "business" ? (
                            <Briefcase className="h-4 w-4" />
                          ) : item.type === "discussion" ? (
                            <MessageSquare className="h-4 w-4" />
                          ) : (
                            <Megaphone className="h-4 w-4" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {item.title}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {item.type} - {item.status.replace("_", " ")}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0 mt-2" />
                      </Link>
                    ))}
                  </>
                ) : (
                  <div className="py-6 text-center">
                    <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">All caught up!</p>
                  </div>
                )}

                {/* Summary badges */}
                <div className="flex flex-wrap gap-2 pt-3 border-t mt-3">
                  {counts.businessPending > 0 && (
                    <Link href="/meetings/business">
                      <Badge variant="outline" className="cursor-pointer hover:bg-gray-50">
                        <Briefcase className="h-3 w-3 mr-1" />
                        {counts.businessPending} pending
                      </Badge>
                    </Link>
                  )}
                  {counts.discussionsActive > 0 && (
                    <Link href="/meetings/discussions">
                      <Badge variant="outline" className="cursor-pointer hover:bg-gray-50">
                        <MessageSquare className="h-3 w-3 mr-1" />
                        {counts.discussionsActive} active
                      </Badge>
                    </Link>
                  )}
                  {counts.announcementsActive > 0 && (
                    <Link href="/meetings/announcements">
                      <Badge variant="outline" className="cursor-pointer hover:bg-gray-50">
                        <Megaphone className="h-3 w-3 mr-1" />
                        {counts.announcementsActive} active
                      </Badge>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="bg-white shadow-sm border-0 ring-1 ring-gray-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button asChild variant="outline" className="w-full justify-start h-11">
                  <Link href="/meetings/new">
                    <CalendarDays className="h-4 w-4 mr-3 text-primary" />
                    New Meeting
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start h-11">
                  <Link href="/meetings/business/new">
                    <Briefcase className="h-4 w-4 mr-3 text-blue-600" />
                    Add Business Item
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start h-11">
                  <Link href="/meetings/announcements/new">
                    <Megaphone className="h-4 w-4 mr-3 text-amber-600" />
                    Create Announcement
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start h-11">
                  <Link href="/meetings/templates">
                    <FileText className="h-4 w-4 mr-3 text-purple-600" />
                    Manage Templates
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Mini Calendar Teaser */}
            <Card className="bg-gradient-to-br from-primary/5 to-primary/10 shadow-sm border-0 ring-1 ring-primary/20">
              <CardContent className="py-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">View Full Calendar</p>
                    <p className="text-xs text-muted-foreground">
                      See all meetings and events
                    </p>
                  </div>
                  <Button asChild variant="ghost" size="icon">
                    <Link href="/calendar/view">
                      <ChevronRight className="h-5 w-5" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
