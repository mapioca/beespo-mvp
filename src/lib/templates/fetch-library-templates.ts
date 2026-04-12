import { createClient } from "@/lib/supabase/server"
import { getDashboardRequestContext } from "@/lib/dashboard/request-context"
import { measureAsync } from "@/lib/performance/measure"
import type { Database } from "@/types/database"

type TemplateRow = Database["public"]["Tables"]["templates"]["Row"]
type TemplateItemRow = Database["public"]["Tables"]["template_items"]["Row"]

type LibraryTemplateWithAuthor = TemplateRow & {
  items?: TemplateItemRow[]
  author?: { full_name: string | null } | null
}

interface FetchLibraryTemplatesResult {
  templates: LibraryTemplateWithAuthor[]
  workspaceId: string | null
  userId: string
}

export async function fetchLibraryTemplates(): Promise<FetchLibraryTemplatesResult> {
  return measureAsync("dashboard.fetch_library_templates", async () => {
    const [{ user, profile }, supabase] = await Promise.all([
      getDashboardRequestContext(),
      createClient(),
    ])

    const workspaceId = profile.workspace_id

    // Fetch Beespo Official (workspace_id IS NULL) + user's own workspace templates.
    // Community templates (is_public = true) are included once that column is added via migration.
    const filter = workspaceId
      ? `workspace_id.is.null,workspace_id.eq.${workspaceId}`
      : "workspace_id.is.null"

    const { data: templates, error: templatesError } = await (
      supabase.from("templates") as ReturnType<typeof supabase.from>
    )
      .select("*, items:template_items(*)")
      .or(filter)
      .order("created_at", { ascending: false })

    const createdByIds = [
      ...new Set(
        ((templates ?? []) as { created_by: string | null }[])
          .map((template) => template.created_by)
          .filter(Boolean) as string[]
      ),
    ]

    const authorMap: Record<string, string> = {}
    if (createdByIds.length > 0) {
      const { data: authors } = await (supabase.from("profiles") as ReturnType<typeof supabase.from>)
        .select("id, full_name")
        .in("id", createdByIds)

      for (const author of (authors ?? []) as { id: string; full_name: string | null }[]) {
        if (author.full_name) {
          authorMap[author.id] = author.full_name
        }
      }
    }

    const templatesWithAuthor = (
      (templates ?? []) as (Record<string, unknown> & { created_by: string | null })[]
    ).map((template) => ({
      ...template,
      author: template.created_by ? { full_name: authorMap[template.created_by] ?? null } : null,
    }))

    if (templatesError) {
      console.error("Library query error:", templatesError.message)
    }

    return {
      templates: templatesWithAuthor as unknown as LibraryTemplateWithAuthor[],
      workspaceId,
      userId: user.id,
    }
  }, { thresholdMs: 25 })
}
