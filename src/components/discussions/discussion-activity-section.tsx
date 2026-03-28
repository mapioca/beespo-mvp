"use client";

import { formatDistanceToNow, format } from "date-fns";

interface Activity {
  id: string;
  user_id: string | null;
  activity_type: string;
  details: Record<string, unknown> | null;
  created_at: string;
  user?: { full_name: string } | null;
}

interface DiscussionActivitySectionProps {
  activities: Activity[];
}

function formatLabel(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function formatActivityText(type: string, details: Record<string, unknown> | null): string {
  switch (type) {
    case "status_changed":
      return `changed status from ${formatLabel(details?.from as string ?? "")} to ${formatLabel(details?.to as string ?? "")}`;
    case "priority_changed":
      return `changed priority from ${formatLabel(details?.from as string ?? "")} to ${formatLabel(details?.to as string ?? "")}`;
    case "category_changed":
      return `changed category to ${formatLabel(details?.to as string ?? "")}`;
    case "due_date_changed":
      return details?.to
        ? `set due date to ${format(new Date(details.to as string), "MMM d, yyyy")}`
        : "removed the due date";
    case "title_changed":
      return "updated the title";
    case "description_changed":
      return "updated the description";
    case "note_added":
      return "added a note";
    case "note_updated":
      return "edited a note";
    case "note_deleted":
      return "deleted a note";
    case "task_created":
      return `created a task${details?.title ? `: "${details.title}"` : ""}`;
    default:
      return type.replace(/_/g, " ");
  }
}

function UserInitial({ name }: { name?: string | null }) {
  const initial = name ? name.charAt(0).toUpperCase() : "?";
  return (
    <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
      <span className="text-[10px] font-medium text-muted-foreground">{initial}</span>
    </div>
  );
}

export function DiscussionActivitySection({ activities }: DiscussionActivitySectionProps) {
  if (activities.length === 0) {
    return (
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-3">Activity</p>
        <p className="text-sm text-muted-foreground">No activity yet.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-3">Activity</p>
      <div className="space-y-3">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start gap-2">
            <UserInitial name={activity.user?.full_name} />
            <div className="flex-1 min-w-0">
              <span className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  {activity.user?.full_name ?? "Someone"}
                </span>{" "}
                {formatActivityText(activity.activity_type, activity.details)}
              </span>
              <span className="text-xs text-muted-foreground/60 ml-2">
                · {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
