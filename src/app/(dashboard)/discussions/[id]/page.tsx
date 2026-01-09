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
import { ArrowLeft, Edit, Plus, CheckSquare, Calendar } from "lucide-react";
import { format } from "date-fns";
import { DiscussionNotesSection } from "@/components/discussions/discussion-notes-section";
import { DiscussionTasksSection } from "@/components/discussions/discussion-tasks-section";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";

// Helper functions (same as list page)
function formatCategory(category: string): string {
  return category.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function getStatusVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "new":
      return "default";
    case "active":
      return "default";
    case "decision_required":
      return "destructive";
    case "monitoring":
      return "secondary";
    case "resolved":
      return "outline";
    case "deferred":
      return "outline";
    default:
      return "default";
  }
}

function getPriorityVariant(
  priority: string
): "default" | "secondary" | "destructive" {
  switch (priority) {
    case "high":
      return "destructive";
    case "medium":
      return "default";
    case "low":
      return "secondary";
    default:
      return "default";
  }
}

export default async function DiscussionDetailPage({
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
    .select("workspace_id, role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile || !["leader", "admin"].includes(profile.role)) {
    redirect("/");
  }

  // Get discussion details
  const { data: discussion } = await (supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("discussions") as any)
    .select("*")
    .eq("id", id)
    .single();

  if (!discussion) {
    notFound();
  }

  // Get parent discussion if this is a follow-up
  let parentDiscussion = null;
  if (discussion.parent_discussion_id) {
    const { data } = await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("discussions") as any)
      .select("id, title")
      .eq("id", discussion.parent_discussion_id)
      .single();
    parentDiscussion = data;
  }

  // Get child discussions (follow-ups)
  const { data: childDiscussions } = await (supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("discussions") as any)
    .select("id, title, status, priority, created_at")
    .eq("parent_discussion_id", id)
    .order("created_at", { ascending: false });

  // Get discussion notes with creator info
  const { data: notes } = await (supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("discussion_notes") as any)
    .select(
      `
      *,
      creator:profiles!discussion_notes_created_by_fkey(full_name),
      meeting:meetings(title, scheduled_date)
    `
    )
    .eq("discussion_id", id)
    .order("created_at", { ascending: false });

  // Get related tasks
  const { data: tasks } = await (supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("tasks") as any)
    .select("id, title, status, due_date, assigned_to")
    .eq("discussion_id", id)
    .order("created_at", { ascending: false });

  // Get related meetings (via agenda_items)
  const { data: agendaItems } = await (supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("agenda_items") as any)
    .select(
      `
      id,
      meeting:meetings(id, title, scheduled_date)
    `
    )
    .eq("discussion_id", id)
    .order("created_at", { ascending: false });

  const relatedMeetings =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    agendaItems?.map((item: any) => item.meeting).filter(Boolean) || [];

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href="/discussions">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Discussions
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Discussion Details */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-3xl">
                      {discussion.title}
                    </CardTitle>
                  </div>
                  {parentDiscussion && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Follow-up to:</span>
                      <Link
                        href={`/discussions/${parentDiscussion.id}`}
                        className="text-primary hover:underline"
                      >
                        {parentDiscussion.title}
                      </Link>
                    </div>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="outline">
                      {formatCategory(discussion.category)}
                    </Badge>
                    <Badge variant={getStatusVariant(discussion.status)}>
                      {formatCategory(discussion.status)}
                    </Badge>
                    <Badge variant={getPriorityVariant(discussion.priority)}>
                      {discussion.priority} priority
                    </Badge>
                  </div>
                </div>
                <Button asChild>
                  <Link href={`/discussions/${discussion.id}/edit`}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Link>
                </Button>
              </div>
              {discussion.description && (
                <CardDescription className="text-base mt-4">
                  {discussion.description}
                </CardDescription>
              )}
              {discussion.due_date && (
                <div className="mt-4 flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Due: {format(new Date(discussion.due_date), "MMMM d, yyyy")}
                  </span>
                </div>
              )}
              {discussion.status === "deferred" &&
                discussion.deferred_reason && (
                  <div className="mt-4 p-3 bg-muted rounded-md">
                    <p className="text-sm font-medium">Deferred Reason:</p>
                    <p className="text-sm text-muted-foreground">
                      {discussion.deferred_reason}
                    </p>
                  </div>
                )}
            </CardHeader>
          </Card>

          {/* Notes Timeline - Client Component */}
          <DiscussionNotesSection
            discussionId={id}
            initialNotes={notes || []}
            currentUserId={user.id}
          />

          {/* Tasks Section - Client Component */}
          <DiscussionTasksSection
            discussionId={id}
            initialTasks={tasks || []}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <CreateTaskDialog context={{ discussion_id: id }}>
                <Button
                  className="w-full justify-start"
                  variant="outline"
                >
                  <CheckSquare className="mr-2 h-4 w-4" />
                  Create Task
                </Button>
              </CreateTaskDialog>
              <Button
                asChild
                className="w-full justify-start"
                variant="outline"
              >
                <Link href={`/discussions/new?follow_up=${id}`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Follow-up
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Related Meetings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Discussed In Meetings</CardTitle>
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
                <p className="text-sm text-muted-foreground">
                  Not yet discussed in any meeting
                </p>
              )}
            </CardContent>
          </Card>

          {/* Follow-up Discussions */}
          {childDiscussions && childDiscussions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Follow-up Discussions</CardTitle>
                <CardDescription>
                  {childDiscussions.length} follow-up
                  {childDiscussions.length !== 1 ? "s" : ""}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {childDiscussions.map((child: any) => (
                    <Link
                      key={child.id}
                      href={`/discussions/${child.id}`}
                      className="block p-2 hover:bg-muted rounded-md transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium flex-1">{child.title}</p>
                        <div className="flex gap-1">
                          <Badge
                            variant={getStatusVariant(child.status)}
                            className="text-xs"
                          >
                            {formatCategory(child.status)}
                          </Badge>
                          <Badge
                            variant={getPriorityVariant(child.priority)}
                            className="text-xs"
                          >
                            {child.priority}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(child.created_at), "MMM d, yyyy")}
                      </p>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
