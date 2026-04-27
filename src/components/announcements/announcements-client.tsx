"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { format, formatDistanceToNow, isFuture, isPast } from "date-fns"
import {
    Calendar,
    Clock,
    Eye,
    Megaphone,
    MoreHorizontal,
    Plus,
    Search,
    Trash2,
    X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
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
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { createClient } from "@/lib/supabase/client"
import { toast } from "@/lib/toast"
import { cn } from "@/lib/utils"
import { richTextToPlainText, sanitizeRichTextHtml } from "@/lib/rich-text"
import {
    Announcement,
    AnnouncementPriority,
    AnnouncementStatus,
} from "./announcements-table"
import { AnnouncementDrawer } from "./announcement-drawer"
import { AnnouncementForm, AnnouncementFormData } from "./announcement-form"

type Scope = "all" | "active" | "draft" | "stopped"

const SCOPES: Array<{ key: Scope; label: string }> = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "draft", label: "Drafts" },
    { key: "stopped", label: "Stopped" },
]

const STATUS_LABEL: Record<AnnouncementStatus, string> = {
    active: "Active",
    draft: "Drafts",
    stopped: "Stopped",
}

const STATUS_ORDER: AnnouncementStatus[] = ["active", "draft", "stopped"]

const PRIORITY_RANK: Record<AnnouncementPriority, number> = {
    high: 0,
    medium: 1,
    low: 2,
}

const PRIORITY_LABEL: Record<AnnouncementPriority, string> = {
    high: "High",
    medium: "Medium",
    low: "Low",
}

interface AnnouncementsClientProps {
    announcements: Announcement[]
    totalCount: number
    statusCounts: Record<string, number>
    priorityCounts: Record<string, number>
    currentFilters: {
        search: string
        status: string[]
    }
    initialViews?: unknown[]
}

export function AnnouncementsClient({
    announcements,
}: AnnouncementsClientProps) {
    const router = useRouter()

    const [scope, setScope] = useState<Scope>("active")
    const [search, setSearch] = useState("")
    const [priorityFilter, setPriorityFilter] =
        useState<AnnouncementPriority | null>(null)

    const [creating, setCreating] = useState(false)
    const [isCreating, setIsCreating] = useState(false)

    const [selectedAnnouncement, setSelectedAnnouncement] =
        useState<Announcement | null>(null)
    const [drawerOpen, setDrawerOpen] = useState(false)

    const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    const counts = useMemo(
        () => ({
            all: announcements.length,
            active: announcements.filter((a) => a.status === "active").length,
            draft: announcements.filter((a) => a.status === "draft").length,
            stopped: announcements.filter((a) => a.status === "stopped").length,
        }),
        [announcements]
    )

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        return announcements
            .filter((a) => {
                if (scope !== "all" && a.status !== scope) return false
                if (priorityFilter && a.priority !== priorityFilter) return false
                if (q) {
                    const hay = `${a.title} ${
                        a.content ? richTextToPlainText(a.content) : ""
                    }`.toLowerCase()
                    if (!hay.includes(q)) return false
                }
                return true
            })
            .sort((a, b) => {
                const pa =
                    PRIORITY_RANK[a.priority as AnnouncementPriority] ?? 99
                const pb =
                    PRIORITY_RANK[b.priority as AnnouncementPriority] ?? 99
                if (pa !== pb) return pa - pb
                return (
                    new Date(b.created_at).getTime() -
                    new Date(a.created_at).getTime()
                )
            })
    }, [announcements, scope, priorityFilter, search])

    const grouped = useMemo(() => {
        const out: Record<AnnouncementStatus, Announcement[]> = {
            active: [],
            draft: [],
            stopped: [],
        }
        for (const a of filtered) {
            const key = (a.status as AnnouncementStatus) || "draft"
            if (out[key]) out[key].push(a)
        }
        return out
    }, [filtered])

    function handleOpen(a: Announcement) {
        setSelectedAnnouncement(a)
        setDrawerOpen(true)
    }

     async function handleDelete(id: string) {
         const supabase = createClient()
         const { error } = await supabase.from<Announcement>("announcements")
             .delete()
             .eq("id", id)

        if (error) {
            toast.error(error.message || "Failed to delete announcement.")
        } else {
            toast.success("Announcement deleted.")
            router.refresh()
        }
    }

    async function confirmDelete() {
        if (!deleteTarget) return
        setIsDeleting(true)
        await handleDelete(deleteTarget.id)
        setIsDeleting(false)
        setDeleteTarget(null)
    }

    async function handleCreate(formData: AnnouncementFormData) {
        setIsCreating(true)
        const supabase = createClient()

        const {
            data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
            toast.error("Not authenticated. Please log in again.")
            setIsCreating(false)
            return
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: profile } = await (supabase.from("profiles") as any)
            .select("workspace_id, role")
            .eq("id", user.id)
            .single()

        if (!profile || !["leader", "admin"].includes(profile.role)) {
            toast.error("Only leaders and admins can create announcements.")
            setIsCreating(false)
            return
        }

         const { data: newAnnouncement, error } = await supabase.from("announcements")
            .insert({
                title: formData.title,
                content: formData.content,
                priority: formData.priority,
                status: "active",
                display_start: formData.displayStart || null,
                display_until: formData.displayUntil || null,
                workspace_id: profile.workspace_id,
                created_by: user.id,
            })
            .select("id")
            .single()

        if (error || !newAnnouncement) {
            toast.error(error?.message || "Failed to create announcement.")
            setIsCreating(false)
            return
        }

        if (formData.templateIds.length > 0) {
            const { error: linkError } = await (
                supabase.from("announcement_templates") as ReturnType<
                    typeof supabase.from
                >
            ).insert(
                formData.templateIds.map((templateId) => ({
                    announcement_id: newAnnouncement.id,
                    template_id: templateId,
                }))
            )
            if (linkError) {
                toast.warning("Created, but could not link to template.")
            }
        }

        toast.success("Announcement created!")
        setIsCreating(false)
        setCreating(false)
        router.refresh()
    }

    const hasActiveFilter = priorityFilter !== null || search.trim() !== ""

    return (
        <div className="min-h-full bg-surface-canvas px-5 py-10 text-foreground sm:px-8 lg:px-12">
            <div className="mx-auto max-w-[1100px]">
                <header className="flex items-start justify-between gap-6">
                    <div className="max-w-[620px]">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            Announcements
                        </div>
                        <h1 className="mt-2 font-serif text-[34px] font-normal leading-none tracking-normal text-foreground">
                            Word worth <em className="italic">spreading</em>
                        </h1>
                        <p className="mt-3 text-[14px] leading-6 text-muted-foreground">
                            Time-sensitive notes for your organization &mdash;
                            posted, prioritized, and visible while they matter.
                        </p>
                    </div>

                    <TooltipProvider delayDuration={150}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    type="button"
                                    onClick={() => setCreating(true)}
                                    aria-label="New announcement"
                                    className="mt-9 grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-brand/10 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                                >
                                    <Plus className="h-4 w-4" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent
                                side="left"
                                sideOffset={6}
                                showArrow={false}
                                className="rounded-[4px] bg-foreground/90 px-1.5 py-0.5 text-[10px] font-medium tracking-tight shadow-sm"
                            >
                                New announcement
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </header>

                <div className="mt-10 flex items-center gap-8 border-b border-border/70">
                    {SCOPES.map((item) => {
                        const active = scope === item.key
                        return (
                            <button
                                key={item.key}
                                type="button"
                                onClick={() => setScope(item.key)}
                                className={cn(
                                    "-mb-px border-b-2 pb-3 text-[13px] transition-colors",
                                    active
                                        ? "border-brand text-foreground"
                                        : "border-transparent text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {item.label}
                                <span className="ml-2 text-[10px] tabular-nums opacity-70">
                                    {counts[item.key]}
                                </span>
                            </button>
                        )
                    })}
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search announcements..."
                            className="h-8 w-[240px] rounded-[8px] border-border/70 bg-surface-sunken pl-8 text-[12.5px]"
                        />
                    </div>

                    <FilterMenu
                        label="Priority"
                        value={priorityFilter}
                        options={(
                            ["high", "medium", "low"] as AnnouncementPriority[]
                        ).map((p) => ({ value: p, label: PRIORITY_LABEL[p] }))}
                        onChange={(v) =>
                            setPriorityFilter(v as AnnouncementPriority | null)
                        }
                    />

                    {hasActiveFilter ? (
                        <button
                            type="button"
                            onClick={() => {
                                setSearch("")
                                setPriorityFilter(null)
                            }}
                            className="ml-1 inline-flex items-center gap-1 text-[11.5px] text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-3 w-3" />
                            Clear
                        </button>
                    ) : null}

                    <div className="ml-auto text-[11.5px] tabular-nums text-muted-foreground">
                        {filtered.length} of {announcements.length}
                    </div>
                </div>

                <main className="mt-8 pb-20">
                    {filtered.length === 0 ? (
                        <Empty onCreate={() => setCreating(true)} />
                    ) : scope === "all" ? (
                        <div className="space-y-10">
                            {STATUS_ORDER.map((status) => {
                                const list = grouped[status]
                                if (list.length === 0) return null
                                return (
                                    <Section
                                        key={status}
                                        label={STATUS_LABEL[status]}
                                        list={list}
                                        onOpen={handleOpen}
                                        onDelete={(a) => setDeleteTarget(a)}
                                    />
                                )
                            })}
                        </div>
                    ) : (
                        <Section
                            label={STATUS_LABEL[scope as AnnouncementStatus]}
                            list={filtered}
                            onOpen={handleOpen}
                            onDelete={(a) => setDeleteTarget(a)}
                        />
                    )}
                </main>
            </div>

            <Dialog open={creating} onOpenChange={setCreating}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden p-0 gap-0">
                    <DialogHeader className="px-5 py-4 space-y-3">
                        <DialogTitle>New announcement</DialogTitle>
                        <p className="text-xs text-muted-foreground">
                            Add a time-based announcement for your organization.
                        </p>
                    </DialogHeader>
                    <AnnouncementForm
                        onSubmit={handleCreate}
                        isLoading={isCreating}
                        onCancel={() => setCreating(false)}
                    />
                </DialogContent>
            </Dialog>

            <AnnouncementDrawer
                announcement={selectedAnnouncement}
                open={drawerOpen}
                onOpenChange={setDrawerOpen}
                onDelete={handleDelete}
            />

            <AlertDialog
                open={!!deleteTarget}
                onOpenChange={(o) => !o && setDeleteTarget(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete announcement</AlertDialogTitle>
                        <AlertDialogDescription>
                            Delete &quot;{deleteTarget?.title}&quot;? This
                            action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

function Section({
    label,
    list,
    onOpen,
    onDelete,
}: {
    label: string
    list: Announcement[]
    onOpen: (a: Announcement) => void
    onDelete: (a: Announcement) => void
}) {
    return (
        <section>
            <div className="mb-3 flex items-baseline justify-between px-1">
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {label}
                </span>
                <span className="text-[11.5px] tabular-nums text-muted-foreground">
                    {list.length} {list.length === 1 ? "post" : "posts"}
                </span>
            </div>
            <div className="space-y-3">
                {list.map((a) => (
                    <AnnouncementCard
                        key={a.id}
                        announcement={a}
                        onOpen={() => onOpen(a)}
                        onDelete={() => onDelete(a)}
                    />
                ))}
            </div>
        </section>
    )
}

function relativeFromNow(dateStr: string | null | undefined): string | null {
    if (!dateStr) return null
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return null
    if (isFuture(date))
        return `IN ${formatDistanceToNow(date).toUpperCase()}`
    if (isPast(date))
        return `${formatDistanceToNow(date).toUpperCase()} AGO`
    return null
}

function AnnouncementCard({
    announcement,
    onOpen,
    onDelete,
}: {
    announcement: Announcement
    onOpen: () => void
    onDelete: () => void
}) {
    const priority = (announcement.priority || "medium") as AnnouncementPriority
    const relativeLabel = relativeFromNow(
        announcement.deadline ?? announcement.display_until
    )

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onOpen}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    onOpen()
                }
            }}
            className="group relative cursor-pointer rounded-[10px] border border-border/70 bg-background p-5 transition-colors hover:bg-[var(--color-stone-100)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-brand/10 text-brand">
                        <Megaphone className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand">
                        Announcement
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    {relativeLabel && (
                        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand">
                            {relativeLabel}
                        </span>
                    )}
                    <DropdownMenu>
                        <DropdownMenuTrigger
                            asChild
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                type="button"
                                className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100 focus:opacity-100"
                                aria-label="Card actions"
                            >
                                <MoreHorizontal className="h-4 w-4" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            align="end"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <DropdownMenuItem onClick={onOpen}>
                                <Eye className="mr-2 h-4 w-4" />
                                Open
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={onDelete}
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <h3 className="mt-4 font-serif text-[22px] font-normal leading-tight text-foreground">
                {announcement.title}
            </h3>

            {announcement.content && (
                <div
                    className="mt-2.5 line-clamp-3 text-[13.5px] leading-6 text-muted-foreground [&_a]:underline [&_li]:ml-5 [&_li]:list-disc [&_ol>li]:list-decimal [&_ol]:my-0.5 [&_p]:my-0 [&_strong]:font-semibold [&_ul]:my-0.5"
                    dangerouslySetInnerHTML={{
                        __html: sanitizeRichTextHtml(announcement.content),
                    }}
                />
            )}

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11.5px] text-muted-foreground">
                {announcement.deadline && (
                    <span className="inline-flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>
                            Until{" "}
                            {format(
                                new Date(announcement.deadline),
                                "MMM d, yyyy"
                            )}
                        </span>
                    </span>
                )}
                {announcement.display_start && (
                    <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        <span>
                            From{" "}
                            {format(
                                new Date(announcement.display_start),
                                "MMM d"
                            )}
                            {announcement.display_until &&
                                ` to ${format(
                                    new Date(announcement.display_until),
                                    "MMM d"
                                )}`}
                        </span>
                    </span>
                )}
                <span className="inline-flex items-center gap-1.5 capitalize">
                    <span
                        className={cn(
                            "inline-block h-1.5 w-1.5 rounded-full",
                            priority === "high" && "bg-destructive",
                            priority === "medium" && "bg-amber-500",
                            priority === "low" && "bg-muted-foreground/50"
                        )}
                    />
                    {PRIORITY_LABEL[priority]} priority
                </span>
                {announcement.creator?.full_name && (
                    <span className="ml-auto text-[11px] text-muted-foreground/80">
                        by {announcement.creator.full_name}
                    </span>
                )}
            </div>
        </div>
    )
}

function FilterMenu({
    label,
    value,
    options,
    onChange,
}: {
    label: string
    value: string | null
    options: Array<{ value: string; label: string }>
    onChange: (value: string | null) => void
}) {
    const [open, setOpen] = useState(false)
    const active = value !== null
    const current = options.find((o) => o.value === value)

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-[11.5px] transition-colors",
                    active
                        ? "border-brand/40 bg-brand/10 text-brand"
                        : "border-border/70 bg-surface-sunken text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
            >
                <span className="opacity-80">{label}:</span>
                <span>{current?.label ?? "Any"}</span>
            </button>
            {open ? (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setOpen(false)}
                    />
                    <div className="absolute left-0 top-full z-50 mt-1.5 min-w-[180px] overflow-hidden rounded-[8px] border bg-popover shadow-lg">
                        <button
                            type="button"
                            onClick={() => {
                                onChange(null)
                                setOpen(false)
                            }}
                            className={cn(
                                "w-full px-3 py-2 text-left text-[13px] hover:bg-accent",
                                value === null && "text-brand"
                            )}
                        >
                            Any {label.toLowerCase()}
                        </button>
                        <div className="h-px bg-border" />
                        {options.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                    onChange(opt.value)
                                    setOpen(false)
                                }}
                                className={cn(
                                    "w-full px-3 py-2 text-left text-[13px] hover:bg-accent",
                                    value === opt.value && "text-brand"
                                )}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </>
            ) : null}
        </div>
    )
}

function Empty({ onCreate }: { onCreate: () => void }) {
    return (
        <div className="rounded-[10px] border border-border/70 bg-background px-6 py-16 text-center">
            <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Megaphone className="h-5 w-5 text-muted-foreground" />
            </span>
            <h3 className="font-serif text-xl font-normal">
                Nothing to announce yet
            </h3>
            <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-muted-foreground">
                Post a time-based note for your team. It&apos;ll show up
                wherever announcements are surfaced.
            </p>
            <Button
                onClick={onCreate}
                className="mt-5 h-9 rounded-[8px] bg-brand px-4 text-[12.5px] font-medium text-brand-foreground hover:bg-[hsl(var(--brand-hover))]"
            >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                New announcement
            </Button>
        </div>
    )
}
