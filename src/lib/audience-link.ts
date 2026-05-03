export function getAudienceUrl(
  workspaceSlug: string,
  token: string,
  baseUrl?: string,
): string {
  const base = baseUrl || (typeof window !== "undefined" ? window.location.origin : "")
  return `${base}/${workspaceSlug}/audience/${token}`
}
