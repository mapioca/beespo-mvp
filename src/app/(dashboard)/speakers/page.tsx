import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Mic } from "lucide-react";
import { format } from "date-fns";
import {
  formatSpeakerStatus,
  getSpeakerStatusVariant,
} from "@/lib/speaker-helpers";

export default async function SpeakersPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user profile to check role
  const { data: profile } = await (supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("profiles") as any)
    .select("workspace_id, role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/setup");
  }

  // Only leaders can see speakers (MVP restriction)
  if (profile.role !== "leader") {
    redirect("/");
  }

  // Get all speakers for the organization with meeting info
  const { data: speakers } = await (supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("speakers") as any)
    .select(`
      *,
      agenda_items(
        meeting:meetings(
          id,
          title,
          scheduled_date
        )
      )
    `)
    .eq("workspace_id", profile.workspace_id)
    .order("created_at", { ascending: false });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Speakers</h1>
          <p className="text-muted-foreground">
            Manage and track speakers across all meetings
          </p>
        </div>
        <Button asChild>
          <Link href="/speakers/new">
            <Plus className="mr-2 h-4 w-4" />
            New Speaker
          </Link>
        </Button>
      </div>

      {speakers && speakers.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Topic</TableHead>
                <TableHead>Meeting</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {speakers.map((speaker: any) => {
                const meeting = speaker.agenda_items?.[0]?.meeting;
                return (
                  <TableRow key={speaker.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/speakers/${speaker.id}`}
                        className="hover:underline"
                      >
                        {speaker.name}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {speaker.topic}
                    </TableCell>
                    <TableCell>
                      {meeting ? (
                        <Link
                          href={`/meetings/${meeting.id}`}
                          className="text-sm text-muted-foreground hover:underline"
                        >
                          {meeting.title}
                        </Link>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          Not assigned
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {meeting?.scheduled_date
                        ? format(
                          new Date(meeting.scheduled_date),
                          "MMM d, yyyy"
                        )
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={getSpeakerStatusVariant(speaker.is_confirmed)}
                      >
                        {formatSpeakerStatus(speaker.is_confirmed)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/speakers/${speaker.id}`}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 border rounded-lg bg-muted/50">
          <Mic className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium mb-2">No speakers yet</p>
          <p className="text-sm text-muted-foreground mb-4">
            Add speakers to track who spoke and when
          </p>
          <Button asChild>
            <Link href="/speakers/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Speaker
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
