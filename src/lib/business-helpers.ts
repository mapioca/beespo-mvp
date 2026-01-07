// Helper functions for Business feature

/**
 * Format business category for display
 * Converts: "sustaining" → "Sustaining"
 */
export function formatBusinessCategory(category: string): string {
  return category.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

/**
 * Get status badge variant for business items
 * - pending: default (blue)
 * - completed: outline (gray)
 */
export function getBusinessStatusVariant(
  status: string
): "default" | "outline" {
  switch (status) {
    case "pending":
      return "default";
    case "completed":
      return "outline";
    default:
      return "default";
  }
}
