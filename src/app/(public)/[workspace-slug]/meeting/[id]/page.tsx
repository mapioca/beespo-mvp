import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { Clock, Check } from "lucide-react";

interface PublicMeetingPageProps {
  params: Promise<{
    "workspace-slug": string;
    id: string;
  }>;
}

interface AgendaItemData {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
  duration_minutes: number | null;
  item_type: string;
  is_completed: boolean;
  participant_name: string | null;
}

interface MeetingData {
  id: string;
  title: string;
  scheduled_date: string;
  status: string;
  is_publicly_shared: boolean;
  workspaces: { slug: string | null };
}

export default async function PublicMeetingPage({ params }: PublicMeetingPageProps) {
  const { "workspace-slug": workspaceSlug, id: meetingId } = await params;

  const supabase = await createClient();

  // Fetch meeting with workspace verification
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: meeting, error: meetingError } = await (supabase.from("meetings") as any)
    .select(`
      id,
      title,
      scheduled_date,
      status,
      is_publicly_shared,
      workspaces!inner(slug)
    `)
    .eq("id", meetingId)
    .eq("is_publicly_shared", true)
    .single() as { data: MeetingData | null; error: unknown };

  if (meetingError || !meeting) {
    notFound();
  }

  // Verify workspace slug matches
  if (meeting.workspaces?.slug !== workspaceSlug) {
    notFound();
  }

  // Fetch agenda items
  const { data: items } = await supabase
    .from("agenda_items")
    .select("id, title, description, order_index, duration_minutes, item_type, is_completed, participant_name")
    .eq("meeting_id", meetingId)
    .order("order_index") as { data: AgendaItemData[] | null };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Meeting Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{meeting.title}</h1>
        <div className="flex items-center gap-4 text-muted-foreground">
          <span>
            {format(new Date(meeting.scheduled_date), "EEEE, MMMM d, yyyy")}
          </span>
          <span className={`
            px-2 py-0.5 rounded-full text-xs font-medium
            ${meeting.status === "completed"
              ? "bg-green-100 text-green-700"
              : meeting.status === "in_progress"
                ? "bg-yellow-100 text-yellow-700"
                : "bg-blue-100 text-blue-700"
            }
          `}>
            {meeting.status.replace("_", " ")}
          </span>
        </div>
      </div>

      {/* Agenda Items */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold border-b pb-2">Agenda</h2>

        {items && items.length > 0 ? (
          <div className="space-y-3">
            {items.map((item, idx) => (
              <div
                key={item.id}
                className={`
                  p-4 rounded-lg border bg-card
                  ${item.is_completed ? "opacity-60" : ""}
                `}
              >
                <div className="flex items-start gap-4">
                  <span className="text-2xl font-bold text-muted-foreground/30">
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{item.title}</h3>
                      <span className="text-xs bg-muted px-2 py-0.5 rounded capitalize">
                        {item.item_type}
                      </span>
                      {item.is_completed && (
                        <span className="flex items-center gap-1 text-xs text-green-600">
                          <Check className="h-3 w-3" />
                          Completed
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-sm text-muted-foreground">
                        {item.description}
                      </p>
                    )}
                    {item.participant_name && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Presenter: {item.participant_name}
                      </p>
                    )}
                  </div>
                  {item.duration_minutes && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="h-4 w-4 mr-1" />
                      {item.duration_minutes} min
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground py-8 text-center">
            No agenda items available.
          </p>
        )}
      </div>

      {/* Info Box */}
      <div className="mt-8 p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
        <p>
          This is a public view of the meeting agenda. Notes and detailed discussions are only visible to workspace members.
        </p>
      </div>
    </div>
  );
}
