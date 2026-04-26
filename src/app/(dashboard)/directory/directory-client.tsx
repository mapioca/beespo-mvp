"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus, Search, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { DirectoryDetailsPanel } from "./directory-details-panel"

export type DirectoryMember = {
  id: string
  name: string
  gender?: "male" | "female" | null
  created_at: string | null
}

type DirectoryClientProps = {
  members: DirectoryMember[]
  totalCount: number
  workspaceId: string
  hasError?: boolean
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

export function DirectoryClient({
  members,
  totalCount,
  workspaceId,
  hasError = false,
}: DirectoryClientProps) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [selectedMember, setSelectedMember] = useState<DirectoryMember | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [search, setSearch] = useState("")

  const sortedMembers = useMemo(
    () => [...members].sort((a, b) => a.name.localeCompare(b.name)),
    [members]
  )

  const filteredMembers = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return sortedMembers

    return sortedMembers.filter((member) => {
      const text = `${member.name} member ward directory`.toLowerCase()
      return text.includes(query)
    })
  }, [search, sortedMembers])

  async function handleAddMember() {
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError("Enter a member name.")
      return
    }

    setError(null)
    const supabase = createClient()
    const { error: insertError } = await (supabase.from("directory") as ReturnType<typeof supabase.from>)
      .insert({
        workspace_id: workspaceId,
        name: trimmedName,
      })

    if (insertError) {
      setError(insertError.message || "Could not add this member.")
      return
    }

    setName("")
    setDialogOpen(false)
    startTransition(() => router.refresh())
  }

  return (
    <div className="min-h-full bg-surface-canvas px-5 py-10 text-foreground sm:px-8 lg:px-12">
      <main className="mx-auto w-full max-w-[1100px] pb-20">
        <header className="mb-10">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row">
            <div className="max-w-[620px]">
              <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                Directory
              </p>
              <h1 className="font-serif text-3xl font-normal leading-tight tracking-normal text-foreground md:text-[34px]">
                It&#39;s all about <em className="italic">them</em>
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                Every member record your workspace depends on - available for callings,
                assignments, meetings, and more.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-3 md:pt-9">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {totalCount} {totalCount === 1 ? "member" : "members"}
              </span>
              <Button
                type="button"
                className="h-9 rounded-[8px] bg-brand px-4 text-[12.5px] font-medium text-brand-foreground hover:bg-[hsl(var(--brand-hover))]"
                onClick={() => {
                  setError(null)
                  setDialogOpen(true)
                }}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add member
              </Button>
            </div>
          </div>
        </header>

        <div className="mb-8 border-b border-border/70">
          <div className="flex flex-col gap-4 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-8">
              <button
                type="button"
                className="relative -mb-5 border-b-2 border-brand pb-5 text-[13px] font-medium text-foreground"
              >
                Members
                <span className="ml-2 text-[10px] tabular-nums opacity-70">
                  {filteredMembers.length}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search directory..."
                  className="h-8 w-full rounded-[8px] border-border/70 bg-surface-sunken pl-8 pr-8 text-[12.5px] sm:w-[240px]"
                />
                {search ? (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label="Clear directory search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
              <span
                className={cn(
                  "hidden text-[11.5px] tabular-nums text-muted-foreground sm:block",
                  search.trim() && "text-foreground"
                )}
              >
                {filteredMembers.length} of {totalCount}
              </span>
            </div>
          </div>
        </div>

        {hasError ? (
          <div className="rounded-[8px] border border-border bg-background px-4 py-3 text-[13px] text-muted-foreground">
            Error loading directory. Please try again.
          </div>
        ) : sortedMembers.length === 0 ? (
          <div className="rounded-[8px] border border-border bg-background px-4 py-6 text-center text-[13.5px] text-muted-foreground">
            No members in the directory yet.
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="rounded-[8px] border border-border bg-background px-4 py-6 text-center text-[13.5px] text-muted-foreground">
            No members match that search.
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-2.5">
            {filteredMembers.map((member) => (
              <button
                key={member.id}
                type="button"
                onClick={() => {
                  setSelectedMember(member)
                  setDetailsOpen(true)
                }}
                className="flex items-center gap-3 rounded-[10px] border border-[var(--color-border)] bg-[var(--app-nav-card)] px-3.5 py-3 text-left transition-colors hover:bg-[var(--color-stone-100)]"
              >
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--color-stone-100)] text-[13px] font-semibold text-[var(--color-text-secondary)]">
                  {initials(member.name)}
                </div>
                <div className="min-w-0">
                  <div className="truncate font-serif text-[15px] text-[var(--color-text-primary)]">
                    {member.name}
                  </div>
                  <div className="mt-px truncate text-[11.5px] text-[var(--color-text-tertiary)]">
                    Member
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      <DirectoryDetailsPanel
        member={selectedMember}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-[10px] border-[var(--color-border)] bg-[var(--app-nav-card)]">
          <DialogHeader>
            <DialogTitle>Add member</DialogTitle>
            <DialogDescription>Add a person to the ward directory.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Member name"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  void handleAddMember()
                }
              }}
            />
            {error ? <p className="text-[12px] text-destructive">{error}</p> : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleAddMember()} disabled={isPending}>
              Add member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
