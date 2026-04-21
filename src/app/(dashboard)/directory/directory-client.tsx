"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"

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

export type DirectoryMember = {
  id: string
  name: string
  created_at: string | null
}

type DirectoryClientProps = {
  members: DirectoryMember[]
  totalCount: number
  workspaceId: string
  wardName: string
  hasError?: boolean
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function householdLabel(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const familyName = parts.length > 1 ? parts[parts.length - 1] : parts[0]
  return familyName ? `${familyName} household` : "Ward member"
}

export function DirectoryClient({
  members,
  totalCount,
  workspaceId,
  wardName,
  hasError = false,
}: DirectoryClientProps) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const sortedMembers = useMemo(
    () => [...members].sort((a, b) => a.name.localeCompare(b.name)),
    [members]
  )

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
    <div className="min-h-full bg-[var(--color-bg-app)] text-[var(--color-text-primary)]">
      <div className="sticky top-0 z-10 flex h-[52px] min-h-[52px] items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-bg-app)] px-[22px] backdrop-blur">
        <div className="flex items-center gap-2 text-[13px] text-[var(--color-text-secondary)]">
          <strong className="font-medium text-[var(--color-text-primary)]">Ward Directory</strong>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-auto rounded-[6px] border-[var(--color-stone-300)] bg-[var(--app-nav-card)] px-3 py-1.5 text-[13px] font-medium text-[var(--color-text-secondary)] hover:border-[var(--color-text-tertiary)] hover:bg-[var(--app-nav-card)]"
            onClick={() => {
              setError(null)
              setDialogOpen(true)
            }}
          >
            <Plus className="h-[13px] w-[13px]" />
            Add member
          </Button>
        </div>
      </div>

      <main className="mx-auto w-full max-w-[1100px] px-6 py-7 pb-20 sm:px-9">
        <header className="mb-7 flex items-end gap-5 border-b border-[var(--color-border)] pb-[22px]">
          <div>
            <div className="mb-0.5 text-[13px] tracking-[0.02em] text-[var(--color-text-tertiary)]">
              {wardName}
            </div>
            <h1 className="m-0 font-serif text-[32px] font-normal tracking-[-0.02em] text-[var(--color-text-primary)]">
              {totalCount} {totalCount === 1 ? "member" : "members"}
            </h1>
            <div className="mt-1 text-[13.5px] text-[var(--color-text-secondary)]">
              Showing all households. People assigned here appear throughout Beespo.
            </div>
          </div>
        </header>

        {hasError ? (
          <div className="rounded-[10px] border border-[var(--color-border)] bg-[var(--app-nav-card)] px-4 py-3 text-[13px] text-[var(--color-text-secondary)]">
            Error loading directory. Please try again.
          </div>
        ) : sortedMembers.length === 0 ? (
          <div className="rounded-[10px] border border-[var(--color-border)] bg-[var(--app-nav-card)] px-4 py-6 text-center text-[13.5px] text-[var(--color-text-secondary)]">
            No members in the directory yet.
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-2.5">
            {sortedMembers.map((member) => (
              <article
                key={member.id}
                className="flex items-center gap-3 rounded-[10px] border border-[var(--color-border)] bg-[var(--app-nav-card)] px-3.5 py-3"
              >
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--color-stone-100)] text-[13px] font-semibold text-[var(--color-text-secondary)]">
                  {initials(member.name)}
                </div>
                <div className="min-w-0">
                  <div className="truncate font-serif text-[15px] text-[var(--color-text-primary)]">
                    {member.name}
                  </div>
                  <div className="mt-px truncate text-[11.5px] text-[var(--color-text-tertiary)]">
                    {householdLabel(member.name)}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

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
