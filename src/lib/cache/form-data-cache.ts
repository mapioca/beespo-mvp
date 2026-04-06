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
