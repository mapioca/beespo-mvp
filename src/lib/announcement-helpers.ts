// Helper functions for Announcements feature

/**
 * Get status badge variant for announcements
 * - draft: secondary (gray)
 * - active: default (blue)
 * - stopped: outline (light gray)
 */
export function getAnnouncementStatusVariant(
  status: string
): "default" | "secondary" | "outline" {
  switch (status) {
    case "draft":
      return "secondary";
    case "active":
      return "default";
    case "stopped":
      return "outline";
    default:
      return "default";
  }
}

/**
 * Get priority badge variant for announcements
 * - high: destructive (red)
 * - medium: default (blue)
 * - low: secondary (gray)
 */
export function getAnnouncementPriorityVariant(
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

/**
 * Format status for display
 * Converts: "active" → "Active"
 */
export function formatAnnouncementStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

/**
 * Check if announcement is expired
 * Returns true if deadline has passed
 */
export function isAnnouncementExpired(deadline: string | null): boolean {
  if (!deadline) return false;
  const deadlineDate = new Date(deadline);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset to start of day for fair comparison
  return deadlineDate < today;
}

/**
 * Get days until deadline
 * Returns null if no deadline, negative if expired
 */
export function getDaysUntilDeadline(deadline: string | null): number | null {
  if (!deadline) return null;
  const deadlineDate = new Date(deadline);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffTime = deadlineDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
