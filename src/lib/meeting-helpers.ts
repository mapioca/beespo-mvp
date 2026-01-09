// Helper functions for meeting display and formatting

export function getMeetingStatusVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "scheduled":
      return "default";
    case "in_progress":
      return "secondary";
    case "completed":
      return "outline";
    case "cancelled":
      return "destructive";
    default:
      return "default";
  }
}

export function formatMeetingStatus(status: string): string {
  switch (status) {
    case "scheduled":
      return "Scheduled";
    case "in_progress":
      return "In Progress";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}
