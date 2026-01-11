import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Calendar, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import {
  formatAnnouncementStatus,
  getAnnouncementStatusVariant,
  getAnnouncementPriorityVariant,
  getDaysUntilDeadline,
} from "@/lib/announcement-helpers";
import { AnnouncementQuickActions } from "@/components/announcements/announcement-quick-actions";

export default async function AnnouncementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Parallelize all queries
  const [
    { data: profile },
    { data: announcement },
    { data: agendaItems }
  ] = await Promise.all([
    // Get user profile
    (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("profiles") as any)
      .select("workspace_id, role, full_name")
      .eq("id", user.id)
      .single(),
    // Get announcement with specific columns only
    (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("announcements") as any)
      .select("id, title, content, status, priority, deadline, created_at, updated_at, workspace_id")
      .eq("id", id)
      .single(),
    // Get related meetings (via agenda_items)
    (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("agenda_items") as any)
      .select(`
        id,
        meeting:meetings(id, title, scheduled_date)
      `)
      .eq("announcement_id", id)
      .order("created_at", { ascending: false })
  ]);

  if (!profile || !["leader", "admin"].includes(profile.role)) {
    redirect("/");
  }

  if (!announcement) {
    notFound();
  }

  const relatedMeetingsMap = new Map();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  agendaItems?.forEach((item: any) => {
    if (item.meeting && !relatedMeetingsMap.has(item.meeting.id)) {
      relatedMeetingsMap.set(item.meeting.id, item.meeting);
    }
  });

  const relatedMeetings = Array.from(relatedMeetingsMap.values());

  // Calculate days until deadline
  const daysUntilDeadline = getDaysUntilDeadline(announcement.deadline);

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href="/announcements">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Announcements
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Announcement Details */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-3xl">
                      {announcement.title}
                    </CardTitle>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Badge
                      variant={getAnnouncementPriorityVariant(
                        announcement.priority
                      )}
                    >
                      {announcement.priority.toUpperCase()} PRIORITY
                    </Badge>
                    <Badge
                      variant={getAnnouncementStatusVariant(announcement.status)}
                    >
                      {formatAnnouncementStatus(announcement.status)}
                    </Badge>
                  </div>
                </div>
                <Button asChild>
                  <Link href={`/announcements/${announcement.id}/edit`}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Link>
                </Button>
              </div>

              {/* Deadline Info */}
              {announcement.deadline && (
                <div className="mt-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Deadline:{" "}
                      {format(new Date(announcement.deadline), "MMMM d, yyyy")}
                    </span>
                    {daysUntilDeadline !== null && daysUntilDeadline >= 0 && (
                      <span className="text-muted-foreground">
                        ({daysUntilDeadline} day{daysUntilDeadline !== 1 ? "s" : ""}{" "}
                        remaining)
                      </span>
                    )}
                  </div>
                  {daysUntilDeadline !== null &&
                    daysUntilDeadline < 3 &&
                    daysUntilDeadline >= 0 &&
                    announcement.status === "active" && (
                      <div className="mt-2 flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm text-yellow-800">
                          Expiring soon!
                        </span>
                      </div>
                    )}
                  {daysUntilDeadline !== null && daysUntilDeadline < 0 && (
                    <div className="mt-2 flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-md">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <span className="text-sm text-red-800">
                        Deadline passed
                      </span>
                    </div>
                  )}
                </div>
              )}

              {!announcement.deadline && (
                <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>No deadline set (ongoing)</span>
                </div>
              )}

              {/* Content */}
              {announcement.content && (
                <div className="mt-4 p-3 bg-muted rounded-md">
                  <p className="text-sm font-medium">Content:</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {announcement.content}
                  </p>
                </div>
              )}

              <div className="mt-4 text-xs text-muted-foreground">
                Created{" "}
                {format(
                  new Date(announcement.created_at),
                  "MMM d, yyyy 'at' h:mm a"
                )}
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <AnnouncementQuickActions
                announcementId={id}
                initialStatus={announcement.status}
                relatedMeetingsCount={relatedMeetings.length}
              />
              <Button asChild className="w-full" variant="outline">
                <Link href={`/announcements/${id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Details
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Related Meetings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Related Meetings</CardTitle>
              <CardDescription>
                {relatedMeetings.length} meeting
                {relatedMeetings.length !== 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {relatedMeetings.length > 0 ? (
                <div className="space-y-2">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {relatedMeetings.map((meeting: any) => (
                    <Link
                      key={meeting.id}
                      href={`/meetings/${meeting.id}`}
                      className="block p-2 hover:bg-muted rounded-md transition-colors"
                    >
                      <p className="text-sm font-medium">{meeting.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(meeting.scheduled_date), "MMM d, yyyy")}
                      </p>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  <p>Not yet in any meeting.</p>
                  {announcement.status === "active" && (
                    <p className="mt-1 text-xs">
                      Will automatically appear in new meetings.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
