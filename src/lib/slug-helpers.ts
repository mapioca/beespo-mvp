/**
 * URL generation utilities for public sharing
 */

/**
 * Generate a slug from a name
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

/**
 * Generate a random token for public sharing
 */
export function generateShareToken(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 16; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Get the public URL for a shared meeting
 */
export function getPublicMeetingUrl(
  workspaceSlug: string,
  meetingId: string,
  baseUrl?: string
): string {
  const base = baseUrl || (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/${workspaceSlug}/meeting/${meetingId}`;
}

/**
 * Get the public URL for a shared template
 */
export function getPublicTemplateUrl(
  workspaceSlug: string,
  templateSlug: string,
  baseUrl?: string
): string {
  const base = baseUrl || (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/${workspaceSlug}/${templateSlug}`;
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    // Fallback for older browsers
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
    return true;
  } catch (err) {
    console.error("Failed to copy to clipboard:", err);
    return false;
  }
}
