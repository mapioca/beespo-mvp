import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Database } from "@/types/database";

type MeetingStatus = Database['public']['Tables']['meetings']['Row']['status'];

interface MeetingStatusBadgeProps {
  status: MeetingStatus;
  className?: string;
}

export function MeetingStatusBadge({ status, className }: MeetingStatusBadgeProps) {
  const variants: Record<MeetingStatus, string> = {
    scheduled: "bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200",
    in_progress: "bg-green-100 text-green-800 hover:bg-green-200 border-green-200 animate-pulse",
    completed: "bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-200",
    cancelled: "bg-red-100 text-red-800 hover:bg-red-200 border-red-200",
  };

  const labels: Record<MeetingStatus, string> = {
    scheduled: "Scheduled",
    in_progress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
  };

  return (
    <Badge 
      variant="outline" 
      className={cn("capitalize font-medium border", variants[status], className)}
    >
      {labels[status]}
    </Badge>
  );
}
