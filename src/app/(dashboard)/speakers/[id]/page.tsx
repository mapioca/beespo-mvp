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
import { ArrowLeft, Edit, Calendar, Mic } from "lucide-react";
import { format } from "date-fns";
import {
  formatSpeakerStatus,
  getSpeakerStatusVariant,
} from "@/lib/speaker-helpers";
import { SpeakerQuickActions } from "@/components/speakers/speaker-quick-actions";

export default async function SpeakerDetailPage({
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

  if (!profile || profile.role !== "leader") {
    redirect("/");
  }

  // Get speaker details
  const { data: speaker } = await (supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("speakers") as any)
    .select("*")
    .eq("id", id)
    .single();

  if (!speaker) {
    notFound();
  }

  // Get related meeting (via agenda_items)
  const { data: agendaItem } = await (supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("agenda_items") as any)
    .select(
      `
      id,
      meeting:meetings(id, title, scheduled_date)
    `
    )
    .eq("speaker_id", id)
    .maybeSingle();

  const relatedMeeting = agendaItem?.meeting || null;

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href="/speakers">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Speakers
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Speaker Details */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Mic className="h-8 w-8 text-muted-foreground" />
                    <CardTitle className="text-3xl">{speaker.name}</CardTitle>
                  </div>
                  <div className="flex gap-2">
                    <Badge
                      variant={getSpeakerStatusVariant(speaker.is_confirmed)}
                    >
                      {formatSpeakerStatus(speaker.is_confirmed)}
                    </Badge>
                  </div>
                </div>
                <Button asChild>
                  <Link href={`/speakers/${speaker.id}/edit`}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Link>
                </Button>
              </div>

              {/* Topic */}
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">Topic:</p>
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {speaker.topic}
                  </p>
                </div>
              </div>

              <div className="mt-4 text-xs text-muted-foreground">
                Created{" "}
                {format(
                  new Date(speaker.created_at),
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
              <SpeakerQuickActions
                speakerId={id}
                initialConfirmed={speaker.is_confirmed}
                hasRelatedMeeting={!!relatedMeeting}
              />
              <Button asChild className="w-full" variant="outline">
                <Link href={`/speakers/${id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Details
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Related Meeting */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Related Meeting</CardTitle>
              <CardDescription>
                {relatedMeeting ? "Assigned to meeting" : "Not yet assigned"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {relatedMeeting ? (
                <Link
                  href={`/meetings/${relatedMeeting.id}`}
                  className="block p-2 hover:bg-muted rounded-md transition-colors"
                >
                  <p className="text-sm font-medium">{relatedMeeting.title}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {format(
                        new Date(relatedMeeting.scheduled_date),
                        "MMM d, yyyy"
                      )}
                    </span>
                  </div>
                </Link>
              ) : (
                <div className="text-sm text-muted-foreground">
                  <p>Not yet assigned to a meeting.</p>
                  <p className="mt-1 text-xs">
                    Assign this speaker to a meeting agenda.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
