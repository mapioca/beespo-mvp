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
import { Plus, Calendar } from "lucide-react";
import { format } from "date-fns";
import { getMeetingStatusVariant, formatMeetingStatus } from "@/lib/meeting-helpers";

export default async function MeetingsPage() {
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
    .select("organization_id, role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/setup");
  }

  // Get all meetings for the organization
  const { data: meetings } = await (supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("meetings") as any)
    .select("*, templates(name), profiles!created_by(full_name)")
    .eq("organization_id", profile.organization_id)
    .order("scheduled_date", { ascending: false });

  const isLeader = profile.role === "leader";

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Meetings</h1>
          <p className="text-muted-foreground">
            View and manage your organization&apos;s meetings
          </p>
        </div>
        {isLeader && (
          <Button asChild>
            <Link href="/meetings/new">
              <Plus className="mr-2 h-4 w-4" />
              New Meeting
            </Link>
          </Button>
        )}
      </div>

      {meetings && meetings.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Scheduled Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {meetings.map((meeting: any) => (
                <TableRow key={meeting.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/meetings/${meeting.id}`}
                      className="hover:underline"
                    >
                      {meeting.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {meeting.templates ? (
                      <Link
                        href={`/templates/${meeting.template_id}`}
                        className="text-sm text-muted-foreground hover:underline"
                      >
                        {meeting.templates.name}
                      </Link>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        No template
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {format(new Date(meeting.scheduled_date), "MMM d, yyyy h:mm a")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getMeetingStatusVariant(meeting.status)}>
                      {formatMeetingStatus(meeting.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/meetings/${meeting.id}`}>View</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 border rounded-lg bg-muted/50">
          <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium mb-2">No meetings yet</p>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first meeting to get started
          </p>
          {isLeader && (
            <Button asChild>
              <Link href="/meetings/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Meeting
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
