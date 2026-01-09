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
import { ArrowLeft, Edit, Clock, User, Calendar, Play } from "lucide-react";
import { format } from "date-fns";
import { getMeetingStatusVariant, formatMeetingStatus } from "@/lib/meeting-helpers";
import { getItemTypeLabel, getItemTypeBadgeVariant } from "@/types/agenda";
import { MeetingQuickActions } from "@/components/meetings/meeting-quick-actions";

export default async function MeetingDetailPage({
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

  // Get user profile
  const { data: profile } = await (supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("profiles") as any)
    .select("organization_id, role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/setup");
  }

  // Get meeting details with template and creator info
  const { data: meeting } = await (supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("meetings") as any)
    .select("*, templates(name), profiles!created_by(full_name)")
    .eq("id", id)
    .single();

  if (!meeting) {
    notFound();
  }

  // Get agenda items with linked entities
  const { data: agendaItems } = await (supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("agenda_items") as any)
    .select(`
      *,
      discussions(title, status),
      business_items(person_name, category),
      announcements(title, priority),
      speakers(name, topic)
    `)
    .eq("meeting_id", id)
    .order("order_index");

  const isLeader = profile.role === "leader";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalDuration = agendaItems?.reduce((sum: number, item: any) =>
    sum + (item.duration_minutes || 0), 0) || 0;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href="/meetings">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Meetings
          </Link>
        </Button>
      </div>

      <div className="space-y-6">
        {/* Meeting Metadata Card */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-3xl">{meeting.title}</CardTitle>
                  <Badge variant={getMeetingStatusVariant(meeting.status)}>
                    {formatMeetingStatus(meeting.status)}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(meeting.scheduled_date), "EEEE, MMMM d, yyyy 'at' h:mm a")}
                  </div>
                  {meeting.profiles && (
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      Created by {meeting.profiles.full_name}
                    </div>
                  )}
                </div>
                {meeting.templates && (
                  <div className="pt-2">
                    <span className="text-sm text-muted-foreground">Template: </span>
                    <Link
                      href={`/templates/${meeting.template_id}`}
                      className="text-sm hover:underline"
                    >
                      {meeting.templates.name}
                    </Link>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                {isLeader && (
                  <Button asChild>
                    <Link href={`/meetings/${meeting.id}/edit`}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Meeting
                    </Link>
                  </Button>
                )}
                {isLeader && (meeting.status === "scheduled" || meeting.status === "in_progress") && (
                  <Button asChild variant="outline">
                    <Link href={`/meetings/${meeting.id}/conduct`}>
                      <Play className="mr-2 h-4 w-4" />
                      Conduct Meeting
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Quick Actions */}
        {isLeader && (
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <MeetingQuickActions
                meetingId={meeting.id}
                currentStatus={meeting.status}
              />
            </CardContent>
          </Card>
        )}

        {/* Agenda Items Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Agenda Items</CardTitle>
                <CardDescription>
                  {agendaItems?.length || 0} item{agendaItems?.length !== 1 ? "s" : ""}
                  {totalDuration > 0 && (
                    <span className="ml-2 inline-flex items-center">
                      <Clock className="mr-1 h-3 w-3" />
                      {totalDuration} min total
                    </span>
                  )}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {agendaItems && agendaItems.length > 0 ? (
              <div className="space-y-3">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {agendaItems.map((item: any, index: number) => (
                  <div
                    key={item.id}
                    className="flex gap-4 p-4 border rounded-lg bg-card"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium">{item.title}</h4>
                          <Badge variant={getItemTypeBadgeVariant(item.item_type)} className="text-xs">
                            {getItemTypeLabel(item.item_type)}
                          </Badge>
                        </div>
                        {item.duration_minutes && (
                          <Badge variant="outline" className="text-xs flex-shrink-0">
                            <Clock className="mr-1 h-3 w-3" />
                            {item.duration_minutes} min
                          </Badge>
                        )}
                      </div>

                      {item.description && (
                        <p className="text-sm text-muted-foreground">
                          {item.description}
                        </p>
                      )}

                      {/* Display linked entity details */}
                      {item.item_type === "discussion" && item.discussions && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Discussion: </span>
                          <Link
                            href={`/discussions/${item.discussion_id}`}
                            className="hover:underline"
                          >
                            {item.discussions.title}
                          </Link>
                          <Badge variant="outline" className="ml-2 text-xs">
                            {item.discussions.status}
                          </Badge>
                        </div>
                      )}

                      {item.item_type === "business" && item.business_items && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Business: </span>
                          <Link
                            href={`/business/${item.business_item_id}`}
                            className="hover:underline"
                          >
                            {item.business_items.person_name}
                          </Link>
                          <span className="text-muted-foreground ml-2">
                            ({item.business_items.category})
                          </span>
                        </div>
                      )}

                      {item.item_type === "announcement" && item.announcements && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Announcement: </span>
                          <Link
                            href={`/announcements/${item.announcement_id}`}
                            className="hover:underline"
                          >
                            {item.announcements.title}
                          </Link>
                          <Badge variant="outline" className="ml-2 text-xs">
                            {item.announcements.priority}
                          </Badge>
                        </div>
                      )}

                      {item.item_type === "speaker" && item.speakers && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Speaker: </span>
                          <Link
                            href={`/speakers/${item.speaker_id}`}
                            className="hover:underline"
                          >
                            {item.speakers.name}
                          </Link>
                          {item.speakers.topic && (
                            <span className="text-muted-foreground ml-2">
                              - {item.speakers.topic}
                            </span>
                          )}
                        </div>
                      )}

                      {item.notes && (
                        <div className="mt-2 p-3 bg-muted rounded-md">
                          <p className="text-sm font-medium mb-1">Notes:</p>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {item.notes}
                          </p>
                        </div>
                      )}

                      {item.is_completed && (
                        <Badge variant="outline" className="text-xs">
                          ✓ Completed
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No agenda items for this meeting
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
