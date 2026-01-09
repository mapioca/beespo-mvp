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
import { Plus, MessageSquare } from "lucide-react";
import { format } from "date-fns";

// Helper function to format category display
function formatCategory(category: string): string {
  return category.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

// Helper function to get status badge variant
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

// Helper function to get priority badge variant
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

export default async function DiscussionsPage() {
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

  // Get all discussions for the organization
  const { data: discussions } = await (supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("discussions") as any)
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Discussions</h1>
          <p className="text-muted-foreground">
            Track ongoing topics and decisions
          </p>
        </div>
        <Button asChild>
          <Link href="/discussions/new">
            <Plus className="mr-2 h-4 w-4" />
            New Discussion
          </Link>
        </Button>
      </div>

      {discussions && discussions.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {discussions.map((discussion: any) => (
                <TableRow key={discussion.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/discussions/${discussion.id}`}
                      className="hover:underline"
                    >
                      {discussion.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {formatCategory(discussion.category)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(discussion.status)}>
                      {formatCategory(discussion.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getPriorityVariant(discussion.priority)}>
                      {discussion.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {discussion.due_date
                      ? format(new Date(discussion.due_date), "MMM d, yyyy")
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/discussions/${discussion.id}`}>View</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 border rounded-lg bg-muted/50">
          <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium mb-2">No discussions yet</p>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first discussion to start tracking topics
          </p>
          <Button asChild>
            <Link href="/discussions/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Discussion
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
