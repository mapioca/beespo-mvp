/**
 * Module-level caches for data used in forms.
 * These survive component re-renders and modal open/close cycles.
 * They are intentionally NOT React state — they live for the lifetime of the page.
 */

// ── Directory cache ────────────────────────────────────────────────────────

export interface DirectoryPersonCacheEntry {
  id: string
  name: string
  gender: "male" | "female" | null
}

interface DirectoryCache {
  workspaceId: string
  data: DirectoryPersonCacheEntry[]
}

let _directoryCache: DirectoryCache | null = null

export function getDirectoryCache(workspaceId: string): DirectoryPersonCacheEntry[] | null {
  if (_directoryCache?.workspaceId === workspaceId) return _directoryCache.data
  return null
}

export function setDirectoryCache(workspaceId: string, data: DirectoryPersonCacheEntry[]): void {
  _directoryCache = { workspaceId, data }
}

/** Call this after any create, update, or delete on the directory table. */
export function clearDirectoryCache(): void {
  _directoryCache = null
}

// ── Template cache ─────────────────────────────────────────────────────────

export interface TemplateCacheEntry {
  id: string
  name: string
}

interface TemplateCache {
  workspaceId: string | null
  data: TemplateCacheEntry[]
}

let _templateCache: TemplateCache | null = null

export function getTemplateCache(workspaceId: string | null): TemplateCacheEntry[] | null {
  if (_templateCache !== null && _templateCache.workspaceId === workspaceId)
    return _templateCache.data
  return null
}

export function setTemplateCache(workspaceId: string | null, data: TemplateCacheEntry[]): void {
  _templateCache = { workspaceId, data }
}

// ── Workspace profile cache ───────────────────────────────────────────────

interface WorkspaceProfile {
  workspaceId: string
  workspaceType: string | null
}

let _workspaceProfile: WorkspaceProfile | null = null

export function getWorkspaceProfile(): WorkspaceProfile | null {
  return _workspaceProfile
}

export function setWorkspaceProfile(workspaceId: string, workspaceType: string | null): void {
  _workspaceProfile = { workspaceId, workspaceType }
}

// ── Prefetch ──────────────────────────────────────────────────────────────

let _prefetchPromise: Promise<void> | null = null

/**
 * Prefetch directory people and templates into the module-level caches.
 * Safe to call multiple times — deduplicates concurrent calls and skips
 * if the caches are already populated.
 */
export async function prefetchBusinessFormData(): Promise<void> {
  if (_prefetchPromise) return _prefetchPromise

  _prefetchPromise = (async () => {
    try {
      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profile } = await (supabase.from("profiles") as any)
        .select("workspace_id, workspaces(type)")
        .eq("id", user.id)
        .single()

      const workspaceId: string | null =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (profile as any)?.workspace_id ?? null
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const workspaceType: string | null = ((profile as any)?.workspaces?.type as string | null) ?? null

      if (workspaceId) {
        setWorkspaceProfile(workspaceId, workspaceType)
      }

      // Fetch directory and templates in parallel, skipping if already cached
      const directoryNeeded = workspaceId && !getDirectoryCache(workspaceId)
      const templatesNeeded = !getTemplateCache(workspaceId)

      const promises: Promise<void>[] = []

      if (directoryNeeded) {
        promises.push(
          (async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data, error } = await (supabase.from("directory") as any)
              .select("id, name, gender")
              .eq("workspace_id", workspaceId)
              .order("name")

            if (!error && data) {
              setDirectoryCache(workspaceId, data as DirectoryPersonCacheEntry[])
            } else if (error) {
              // Fallback without gender column
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const { data: fallback } = await (supabase.from("directory") as any)
                .select("id, name")
                .eq("workspace_id", workspaceId)
                .order("name")

              if (fallback) {
                const normalized = (fallback as Array<{ id: string; name: string }>).map(
                  (p) => ({ ...p, gender: null as null })
                )
                setDirectoryCache(workspaceId, normalized)
              }
            }
          })()
        )
      }

      if (templatesNeeded) {
        promises.push(
          (async () => {
            const filter = workspaceId
              ? `workspace_id.is.null,workspace_id.eq.${workspaceId}`
              : "workspace_id.is.null"

            const { data, error } = await supabase
              .from("templates")
              .select("id, name")
              .or(filter)
              .order("name")

            if (!error && data) {
              setTemplateCache(workspaceId, data as TemplateCacheEntry[])
            }
          })()
        )
      }

      await Promise.all(promises)
    } finally {
      _prefetchPromise = null
    }
  })()

  return _prefetchPromise
}
