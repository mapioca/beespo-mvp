export const BISHOPRIC_ORGANIZATION_TYPE = "bishopric"

export function isBishopricOrganization(organizationType: string | null | undefined) {
  return organizationType === BISHOPRIC_ORGANIZATION_TYPE
}

export async function getWorkspaceOrganizationType(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  workspaceId: string,
) {
  const { data: workspace } = await (supabase.from("workspaces") as ReturnType<typeof supabase.from>)
    .select("organization_type")
    .eq("id", workspaceId)
    .single()

  return workspace?.organization_type ?? null
}
