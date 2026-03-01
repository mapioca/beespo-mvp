import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Megaphone } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AnnouncementQuickActions } from "@/components/announcements/announcement-quick-actions";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

interface AnnouncementDetailPageProps {
  params: Promise<{ id: string }>;
}

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "draft": return "secondary";
    case "active": return "default";
    case "stopped": return "outline";
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

export default async function AnnouncementDetailPage({ params }: AnnouncementDetailPageProps) {
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

  const { data: announcement, error } = await (supabase
    .from("announcements") as ReturnType<typeof supabase.from>)
    .select("*")
    .eq("id", id)
    .eq("workspace_id", profile.workspace_id)
    .single();

  if (error || !announcement) {
    notFound();
  }

  // Count related meetings for delete confirmation
  const { count: relatedMeetingsCount } = await (supabase
    .from("meeting_announcements") as ReturnType<typeof supabase.from>)
    .select("id", { count: "exact", head: true })
    .eq("announcement_id", id);

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href="/meetings/announcements">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Announcements
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Megaphone className="h-6 w-6 text-muted-foreground" />
                  <div>
                    <CardTitle className="text-2xl">{announcement.title}</CardTitle>
                    {announcement.workspace_announcement_id && (
                      <p className="text-sm text-muted-foreground font-mono mt-1">
                        {announcement.workspace_announcement_id}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge variant={getPriorityVariant(announcement.priority)}>
                    {announcement.priority?.toUpperCase()}
                  </Badge>
                  <Badge variant={getStatusVariant(announcement.status)}>
                    {announcement.status?.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                {announcement.content || "No content provided."}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p>{format(new Date(announcement.created_at), "MMM d, yyyy 'at' h:mm a")}</p>
                </div>
                {announcement.updated_at && (
                  <div>
                    <p className="text-muted-foreground">Last Updated</p>
                    <p>{format(new Date(announcement.updated_at), "MMM d, yyyy 'at' h:mm a")}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground">Display Start</p>
                  <p>
                    {announcement.display_start
                      ? format(new Date(announcement.display_start), "MMM d, yyyy 'at' h:mm a")
                      : "Not set"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Display Until</p>
                  <p>
                    {announcement.display_until
                      ? format(new Date(announcement.display_until), "MMM d, yyyy 'at' h:mm a")
                      : "Not set"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Deadline</p>
                  <p>
                    {announcement.deadline
                      ? format(new Date(announcement.deadline), "MMM d, yyyy")
                      : "No deadline"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Related Meetings</p>
                  <p>{relatedMeetingsCount ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <AnnouncementQuickActions
                announcementId={announcement.id}
                initialStatus={announcement.status as "draft" | "active" | "stopped"}
                relatedMeetingsCount={relatedMeetingsCount ?? 0}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
