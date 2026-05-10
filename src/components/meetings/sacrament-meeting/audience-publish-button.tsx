"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, Loader2, Radio } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  publishPlannerEntryToAudience,
  unpublishPlannerEntryFromAudience,
} from "@/lib/actions/audience-link-actions"
import { toast } from "@/lib/toast"
import { createClient } from "@/lib/supabase/client"

const FIRST_PUBLISH_STORAGE_KEY = "beespo:audience-publish-confirmed:v1"

type AudiencePublishButtonProps = {
  isoDate: string
}

export function AudiencePublishButton({ isoDate }: AudiencePublishButtonProps) {
  const [publishedAt, setPublishedAt] = useState<string | null>(null)
  const [isLoadingState, setIsLoadingState] = useState(true)
  const [isMutating, setIsMutating] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setIsLoadingState(true)
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        if (!cancelled) setIsLoadingState(false)
        return
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profile } = await (supabase.from("profiles") as any)
        .select("workspace_id")
        .eq("id", user.id)
        .single()
      const workspaceId = profile?.workspace_id
      if (!workspaceId) {
        if (!cancelled) setIsLoadingState(false)
        return
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: entry } = await (supabase.from("sacrament_planner_entries") as any)
        .select("audience_published_at")
        .eq("workspace_id", workspaceId)
        .eq("meeting_date", isoDate)
        .maybeSingle()
      if (!cancelled) {
        const value =
          (entry as { audience_published_at?: string | null } | null)?.audience_published_at ?? null
        setPublishedAt(value)
        setIsLoadingState(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [isoDate])

  const runPublish = async () => {
    setIsMutating(true)
    const result = await publishPlannerEntryToAudience(isoDate)
    setIsMutating(false)
    if ("error" in result && result.error) {
      toast.error(result.error)
      return
    }
    if (!result.publishedAt) return
    setPublishedAt(result.publishedAt)
    try {
      window.localStorage.setItem(FIRST_PUBLISH_STORAGE_KEY, "1")
    } catch {
      /* ignore */
    }
    toast.success("Published to audience", {
      description: "The public link now shows this week's program.",
    })
  }

  const handlePublishClick = () => {
    let alreadyConfirmed = false
    try {
      alreadyConfirmed = window.localStorage.getItem(FIRST_PUBLISH_STORAGE_KEY) === "1"
    } catch {
      /* ignore */
    }
    if (alreadyConfirmed) {
      void runPublish()
    } else {
      setConfirmOpen(true)
    }
  }

  const handleUnpublish = async () => {
    setIsMutating(true)
    const result = await unpublishPlannerEntryFromAudience(isoDate)
    setIsMutating(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    setPublishedAt(null)
    toast.success("Removed from audience link")
  }

  if (isLoadingState) {
    return (
      <Button type="button" variant="ghost" size="sm" disabled className="bg-surface-raised border border-border">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      </Button>
    )
  }

  if (publishedAt) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleUnpublish}
        disabled={isMutating}
        className="border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400"
      >
        {isMutating ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <CheckCircle2 className="h-3.5 w-3.5" />
        )}
        <span className="sm:hidden">Published</span>
        <span className="hidden sm:inline">Published · Unpublish</span>
      </Button>
    )
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handlePublishClick}
        disabled={isMutating}
        className="bg-surface-raised border border-border"
      >
        {isMutating ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Radio className="h-3.5 w-3.5" />
        )}
        <span className="sm:hidden">Publish</span>
        <span className="hidden sm:inline">Publish to audience</span>
      </Button>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish this week to the audience link?</AlertDialogTitle>
            <AlertDialogDescription>
              Anyone with the workspace audience link will immediately see this program.
              Future edits to this week stay live until you unpublish or publish a different week.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMutating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault()
                void runPublish().then(() => setConfirmOpen(false))
              }}
              disabled={isMutating}
            >
              Publish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
