"use client"

import { useMemo, useState, type FormEvent } from "react"
import { formatDistanceToNow } from "date-fns"
import { AlertCircle, CalendarSync, Loader2, RefreshCw } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { isValidICalUrl } from "@/lib/ical-parser"
import { toast } from "@/lib/toast"
import type { CalendarSubscription } from "@/types/database"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  SettingsFieldRow,
  SettingsGroup,
  SettingsPageShell,
  SettingsRow,
  SettingsSection,
  settingsInputClassName,
} from "@/components/settings/settings-surface"
import { ColorSwatchPicker } from "@/components/settings/color-swatch-picker"

const PRESET_COLORS = [
  "#6b7280",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
]

interface CalendarSubscriptionsSettingsProps {
  initialSubscriptions: CalendarSubscription[]
  workspaceId: string
  isAdmin: boolean
}

export function CalendarSubscriptionsSettings({
  initialSubscriptions,
  workspaceId,
  isAdmin,
}: CalendarSubscriptionsSettingsProps) {
  const [subscriptions, setSubscriptions] = useState(initialSubscriptions)
  const [name, setName] = useState("")
  const [url, setUrl] = useState("")
  const [color, setColor] = useState(PRESET_COLORS[0])
  const [urlError, setUrlError] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set())
  const [deleteCandidate, setDeleteCandidate] = useState<CalendarSubscription | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [editCandidate, setEditCandidate] = useState<CalendarSubscription | null>(null)
  const [editName, setEditName] = useState("")
  const [editColor, setEditColor] = useState(PRESET_COLORS[0])
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  const isCreateDisabled = useMemo(
    () => !isAdmin || isCreating || !name.trim() || !url.trim() || Boolean(urlError),
    [isAdmin, isCreating, name, url, urlError]
  )

  const openEditDialog = (subscription: CalendarSubscription) => {
    setEditCandidate(subscription)
    setEditName(subscription.name)
    setEditColor(subscription.color)
  }

  const closeEditDialog = () => {
    if (isSavingEdit) return
    setEditCandidate(null)
    setEditName("")
    setEditColor(PRESET_COLORS[0])
  }

  const validateUrl = (value: string) => {
    if (!value) {
      setUrlError("")
      return
    }

    if (!isValidICalUrl(value)) {
      setUrlError("Enter a valid HTTPS iCal feed URL")
      return
    }

    setUrlError("")
  }

  const createSubscription = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isCreateDisabled) return

    setIsCreating(true)
    const supabase = createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      toast.error("Not authenticated")
      setIsCreating(false)
      return
    }

    const { data: created, error } = await (supabase
      .from("calendar_subscriptions") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      .insert({
        workspace_id: workspaceId,
        name: name.trim(),
        url: url.trim(),
        color,
        created_by: user.id,
      })
      .select("*")
      .single()

    if (error || !created) {
      toast.error(error?.message || "Could not create calendar subscription")
      setIsCreating(false)
      return
    }

    setSubscriptions((prev) => [created, ...prev])
    setName("")
    setUrl("")
    setColor(PRESET_COLORS[0])
    toast.success("Subscription created")
    setIsCreating(false)
  }

  const saveEdit = async () => {
    if (!editCandidate || !editName.trim()) return

    setIsSavingEdit(true)
    const supabase = createClient()
    const { data: updated, error } = await (supabase
      .from("calendar_subscriptions") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      .update({
        name: editName.trim(),
        color: editColor,
      })
      .eq("id", editCandidate.id)
      .select("*")
      .single()

    if (error || !updated) {
      toast.error(error?.message || "Could not update subscription")
      setIsSavingEdit(false)
      return
    }

    setSubscriptions((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
    toast.success("Subscription updated")
    setIsSavingEdit(false)
    closeEditDialog()
  }

  const syncSubscription = async (subscription: CalendarSubscription) => {
    setSyncingIds((prev) => new Set([...prev, subscription.id]))
    try {
      const response = await fetch("/api/calendar/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId: subscription.id }),
      })

      if (!response.ok) {
        const payload = await response.json()
        toast.error(payload.error || "Sync failed")
        return
      }

      const payload = await response.json()
      toast.success("Sync complete", {
        description: `${payload.eventsCreated} created, ${payload.eventsUpdated} updated, ${payload.eventsDeleted} removed`,
      })

      const supabase = createClient()
      const { data: refreshed } = await (supabase
        .from("calendar_subscriptions") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select("*")
        .eq("id", subscription.id)
        .single()

      if (refreshed) {
        setSubscriptions((prev) =>
          prev.map((item) => (item.id === refreshed.id ? refreshed : item))
        )
      }
    } catch (error) {
      console.error(error)
      toast.error("Sync failed")
    } finally {
      setSyncingIds((prev) => {
        const next = new Set(prev)
        next.delete(subscription.id)
        return next
      })
    }
  }

  const deleteSubscription = async () => {
    if (!deleteCandidate) return

    setIsDeleting(true)
    const supabase = createClient()
    const { error } = await (supabase
      .from("calendar_subscriptions") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      .delete()
      .eq("id", deleteCandidate.id)

    if (error) {
      toast.error(error.message || "Could not delete subscription")
      setIsDeleting(false)
      return
    }

    setSubscriptions((prev) => prev.filter((item) => item.id !== deleteCandidate.id))
    toast.success("Subscription deleted")
    setIsDeleting(false)
    setDeleteCandidate(null)
  }

  return (
    <>
      <SettingsPageShell
        title="Schedule settings"
        description="Manage calendar subscriptions for schedule with reusable, tokenized settings primitives."
      >
        <SettingsSection
          label="Subscriptions"
          title="Create Calendar Subscription"
          description="Add an external iCal feed."
        >
          <SettingsGroup>
            <form onSubmit={createSubscription}>
              <SettingsFieldRow label="Name">
                <Input
                  id="subscription-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Team calendar"
                  className={settingsInputClassName}
                  disabled={!isAdmin || isCreating}
                />
              </SettingsFieldRow>

              <SettingsFieldRow
                label="iCal URL"
                hint={urlError ? urlError : "HTTPS .ics feed only"}
                hintClassName={urlError ? "text-destructive" : undefined}
              >
                <Input
                  id="subscription-url"
                  type="url"
                  value={url}
                  onChange={(event) => {
                    setUrl(event.target.value)
                    validateUrl(event.target.value)
                  }}
                  placeholder="https://calendar.example.com/events.ics"
                  className={settingsInputClassName}
                  disabled={!isAdmin || isCreating}
                />
              </SettingsFieldRow>

              <SettingsFieldRow label="Color">
                <ColorSwatchPicker
                  colors={PRESET_COLORS}
                  value={color}
                  onChange={setColor}
                  disabled={!isAdmin || isCreating}
                />
              </SettingsFieldRow>

              <div className="flex justify-end px-[var(--settings-row-padding-x)] py-[var(--settings-row-padding-y)]">
                <Button type="submit" disabled={isCreateDisabled}>
                  {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  <span className={isCreating ? "ml-2" : ""}>Create</span>
                </Button>
              </div>
            </form>
          </SettingsGroup>
          {!isAdmin ? (
            <p className="text-xs text-muted-foreground">
              Only admins can create, edit, sync, or delete subscriptions.
            </p>
          ) : null}
        </SettingsSection>

        <SettingsSection
          label="Manage"
          title="Existing Subscriptions"
          description="Edit name and color, run sync, or delete."
        >
          <SettingsGroup>
            {subscriptions.length === 0 ? (
              <SettingsRow
                title="No subscriptions yet"
                description="Create a subscription above to start syncing external calendars."
                leading={<CalendarSync className="h-4 w-4 text-muted-foreground" />}
              />
            ) : (
              subscriptions.map((subscription) => {
                const isSyncing = syncingIds.has(subscription.id)
                const syncedLabel = subscription.last_synced_at
                  ? `Synced ${formatDistanceToNow(new Date(subscription.last_synced_at), {
                      addSuffix: true,
                    })}`
                  : "Never synced"
                const details = subscription.sync_error ? subscription.sync_error : syncedLabel

                return (
                  <SettingsRow
                    key={subscription.id}
                    title={subscription.name}
                    description={details}
                    leading={
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full border border-[hsl(var(--settings-swatch-border))]"
                          style={{ backgroundColor: subscription.color }}
                        />
                        {subscription.sync_error ? (
                          <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                        ) : null}
                      </div>
                    }
                    trailing={
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(subscription)}
                          disabled={!isAdmin}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => syncSubscription(subscription)}
                          disabled={!isAdmin || isSyncing}
                        >
                          {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                          <span className="ml-2">Sync</span>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteCandidate(subscription)}
                          disabled={!isAdmin}
                        >
                          Delete
                        </Button>
                      </div>
                    }
                  />
                )
              })
            )}
          </SettingsGroup>
        </SettingsSection>
      </SettingsPageShell>

      <Dialog open={Boolean(editCandidate)} onOpenChange={(open) => !open && closeEditDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit subscription</DialogTitle>
            <DialogDescription>Update the subscription name and color.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Name</p>
              <Input
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                className={settingsInputClassName}
                disabled={isSavingEdit}
              />
            </div>

            <div className="space-y-1.5">
              <p className="text-sm font-medium">Color</p>
              <ColorSwatchPicker
                colors={PRESET_COLORS}
                value={editColor}
                onChange={setEditColor}
                disabled={isSavingEdit}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeEditDialog} disabled={isSavingEdit}>
              Cancel
            </Button>
            <Button type="button" onClick={saveEdit} disabled={isSavingEdit || !editName.trim()}>
              {isSavingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              <span className={isSavingEdit ? "ml-2" : ""}>Save</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteCandidate)} onOpenChange={(open) => !open && setDeleteCandidate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete calendar subscription</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the subscription and any synced external calendar cache.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteSubscription} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              <span className={isDeleting ? "ml-2" : ""}>{isDeleting ? "Deleting" : "Delete"}</span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
