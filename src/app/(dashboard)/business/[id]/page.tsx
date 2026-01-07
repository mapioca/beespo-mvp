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
import { ArrowLeft, Edit, Calendar } from "lucide-react";
import { format } from "date-fns";
import {
  formatBusinessCategory,
  getBusinessStatusVariant,
} from "@/lib/business-helpers";
import { BusinessQuickActions } from "@/components/business/business-quick-actions";

export default async function BusinessDetailPage({
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
    .select("organization_id, role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "leader") {
    redirect("/");
  }

  // Get business item details
  const { data: businessItem } = await (supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("business_items") as any)
    .select("*")
    .eq("id", id)
    .single();

  if (!businessItem) {
    notFound();
  }

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
    .eq("business_item_id", id)
    .order("created_at", { ascending: false });

  const relatedMeetings =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    agendaItems?.map((item: any) => item.meeting).filter(Boolean) || [];

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href="/business">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Business
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Business Item Details */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-3xl">
                      {businessItem.person_name}
                    </CardTitle>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="outline">
                      {formatBusinessCategory(businessItem.category)}
                    </Badge>
                    <Badge variant={getBusinessStatusVariant(businessItem.status)}>
                      {businessItem.status === "pending" ? "Pending" : "Completed"}
                    </Badge>
                  </div>
                </div>
                <Button asChild>
                  <Link href={`/business/${businessItem.id}/edit`}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Link>
                </Button>
              </div>
              {businessItem.position_calling && (
                <CardDescription className="text-base mt-4">
                  <strong>Position/Calling:</strong> {businessItem.position_calling}
                </CardDescription>
              )}
              {businessItem.action_date && (
                <div className="mt-4 flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Action Date: {format(new Date(businessItem.action_date), "MMMM d, yyyy")}
                  </span>
                </div>
              )}
              {businessItem.notes && (
                <div className="mt-4 p-3 bg-muted rounded-md">
                  <p className="text-sm font-medium">Notes:</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {businessItem.notes}
                  </p>
                </div>
              )}
              <div className="mt-4 text-xs text-muted-foreground">
                Created {format(new Date(businessItem.created_at), "MMM d, yyyy 'at' h:mm a")}
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
              <BusinessQuickActions
                businessItemId={id}
                initialStatus={businessItem.status}
              />
              <Button asChild className="w-full" variant="outline">
                <Link href={`/business/${id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Details
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Related Meetings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Related Meetings</CardTitle>
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
                <div className="text-sm text-muted-foreground">
                  <p>Not yet in any meeting.</p>
                  {businessItem.status === "pending" && (
                    <p className="mt-1 text-xs">
                      Will automatically appear in new meetings.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
