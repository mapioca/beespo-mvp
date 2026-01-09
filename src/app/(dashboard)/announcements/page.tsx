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
import { Plus, Megaphone } from "lucide-react";
import { format } from "date-fns";
import {
  formatAnnouncementStatus,
  getAnnouncementStatusVariant,
  getAnnouncementPriorityVariant,
} from "@/lib/announcement-helpers";

export default async function AnnouncementsPage() {
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

  // Only leaders can see announcements (MVP restriction)
  if (profile.role !== "leader") {
    redirect("/");
  }

  // Get all announcements for the organization
  const { data: announcements } = await (supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("announcements") as any)
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Announcements</h1>
          <p className="text-muted-foreground">
            Manage time-based announcements for your organization
          </p>
        </div>
        <Button asChild>
          <Link href="/announcements/new">
            <Plus className="mr-2 h-4 w-4" />
            New Announcement
          </Link>
        </Button>
      </div>

      {announcements && announcements.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {announcements.map((announcement: any) => (
                <TableRow key={announcement.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/announcements/${announcement.id}`}
                      className="hover:underline"
                    >
                      {announcement.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={getAnnouncementPriorityVariant(
                        announcement.priority
                      )}
                    >
                      {announcement.priority.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={getAnnouncementStatusVariant(
                        announcement.status
                      )}
                    >
                      {formatAnnouncementStatus(announcement.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {announcement.deadline
                      ? format(new Date(announcement.deadline), "MMM d, yyyy")
                      : "No deadline"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/announcements/${announcement.id}`}>
                        View
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 border rounded-lg bg-muted/50">
          <Megaphone className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium mb-2">No announcements yet</p>
          <p className="text-sm text-muted-foreground mb-4">
            Create announcements to share time-based information
          </p>
          <Button asChild>
            <Link href="/announcements/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Announcement
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
