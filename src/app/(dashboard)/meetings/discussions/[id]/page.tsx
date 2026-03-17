import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, MessagesSquare } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { format } from "date-fns";
import { DiscussionNotesSection } from "@/components/discussions/discussion-notes-section";
import { DiscussionTasksSection } from "@/components/discussions/discussion-tasks-section";

export const dynamic = "force-dynamic";

interface DiscussionDetailPageProps {
  params: Promise<{ id: string }>;
}

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "new": return "secondary";
    case "active": return "default";
    case "decision_required": return "destructive";
    case "resolved": return "outline";
    default: return "default";
  }
}

function getPriorityVariant(priority: string): "default" | "secondary" | "destructive" | "outline" {
  switch (priority) {
    case "high": return "destructive";
    case "medium": return "outline";
    case "low": return "secondary";
    default: return "default";
  }
}

export default async function DiscussionDetailPage({ params }: DiscussionDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await (supabase
    .from("profiles") as ReturnType<typeof supabase.from>)
    .select("workspace_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.workspace_id) redirect("/onboarding");

  // Fetch discussion details
  const { data: discussion, error } = await (supabase
    .from("discussions") as ReturnType<typeof supabase.from>)
    .select("*")
    .eq("id", id)
    .eq("workspace_id", profile.workspace_id)
    .single();

  if (error || !discussion) {
    notFound();
  }

  // Fetch discussion notes
  const { data: notes } = await (supabase
    .from("discussion_notes") as ReturnType<typeof supabase.from>)
    .select(`
      *,
      creator:profiles!discussion_notes_created_by_fkey(full_name),
      meeting:meetings(title, scheduled_date)
    `)
    .eq("discussion_id", id)
    .order("created_at", { ascending: false });

  // Fetch related tasks
  const { data: tasks } = await (supabase
    .from("tasks") as ReturnType<typeof supabase.from>)
    .select(`
      *,
      assignee:profiles!tasks_assigned_to_fkey(full_name)
    `)
    .eq("discussion_id", id)
    .order("created_at", { ascending: false });

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href="/meetings/discussions">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Discussions
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <MessagesSquare className="h-6 w-6 text-muted-foreground" />
                  <div>
                    <CardTitle className="text-2xl">{discussion.title}</CardTitle>
                    {discussion.workspace_discussion_id && (
                      <p className="text-sm text-muted-foreground font-mono mt-1">
                        {discussion.workspace_discussion_id}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge variant={getPriorityVariant(discussion.priority)}>
                    {discussion.priority?.toUpperCase()}
                  </Badge>
                  <Badge variant={getStatusVariant(discussion.status)}>
                    {discussion.status?.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                {discussion.description || "No description provided."}
              </div>
            </CardContent>
          </Card>

          <DiscussionNotesSection
            discussionId={discussion.id}
            initialNotes={notes || []}
            currentUserId={user.id}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Category</p>
                  <p className="font-medium">{discussion.category?.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p>{format(new Date(discussion.created_at), "MMM d, yyyy")}</p>
                </div>
                {discussion.due_date && (
                  <div>
                    <p className="text-muted-foreground">Due Date</p>
                    <p>{format(new Date(discussion.due_date), "MMM d, yyyy")}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <DiscussionTasksSection
            initialTasks={tasks || []}
          />
        </div>
      </div>
    </div>
  );
}
