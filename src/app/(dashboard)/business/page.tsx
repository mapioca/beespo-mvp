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
import { Plus, Briefcase } from "lucide-react";
import { format } from "date-fns";
import {
  formatBusinessCategory,
  getBusinessStatusVariant,
} from "@/lib/business-helpers";

export default async function BusinessPage() {
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

  // Only leaders can see business items (MVP restriction)
  if (profile.role !== "leader") {
    redirect("/");
  }

  // Get all business items for the organization
  const { data: businessItems } = await (supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("business_items") as any)
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Business</h1>
          <p className="text-muted-foreground">
            Track formal church procedures and sustainings
          </p>
        </div>
        <Button asChild>
          <Link href="/business/new">
            <Plus className="mr-2 h-4 w-4" />
            New Business Item
          </Link>
        </Button>
      </div>

      {businessItems && businessItems.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Person Name</TableHead>
                <TableHead>Position/Calling</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {businessItems.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/business/${item.id}`}
                      className="hover:underline"
                    >
                      {item.person_name}
                    </Link>
                  </TableCell>
                  <TableCell>{item.position_calling || "-"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {formatBusinessCategory(item.category)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getBusinessStatusVariant(item.status)}>
                      {item.status === "pending" ? "Pending" : "Completed"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {item.action_date
                      ? format(new Date(item.action_date), "MMM d, yyyy")
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/business/${item.id}`}>View</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 border rounded-lg bg-muted/50">
          <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium mb-2">No business items yet</p>
          <p className="text-sm text-muted-foreground mb-4">
            Track sustainings, releases, and other formal church procedures
          </p>
          <Button asChild>
            <Link href="/business/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Business Item
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
