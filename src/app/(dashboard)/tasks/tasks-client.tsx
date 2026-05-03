"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import {
    CalendarClock,
    CalendarIcon,
    ListTodo,
    MessageSquare,
    Plus,
    Search,
    Trash2,
    X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Calendar } from "@/components/ui/calendar"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import { createTask, deleteTask, updateTask } from "@/lib/actions/task-actions"
import { toast } from "@/lib/toast"
import { cn } from "@/lib/utils"

type TaskStatus = "pending" | "in_progress" | "cancelled" | "completed"
type TaskPriority = "high" | "medium" | "low"

type Profile = {
    id: string
    full_name: string | null
    email?: string | null
}

type Task = {
    id: string
    title: string
    description?: string | null
    status: string
    priority?: string | null
    due_date?: string | null
    assigned_to?: string | null
    workspace_task_id?: string | null
    created_at: string
    created_by?: string | null
    assignee?: { full_name: string; email?: string } | null
    labels?: Array<{ id: string; name: string; color: string }>
    tags?: string[] | null
}

type TasksClientProps = {
    tasks: Task[]
    currentUserId: string
    profiles: Profile[]
}

type Tone = "neutral" | "primary" | "success" | "warning" | "danger" | "muted"

const STATUS_ORDER: TaskStatus[] = [
    "pending",
    "in_progress",
    "cancelled",
    "completed",
]

const STATUS_LABEL: Record<TaskStatus, string> = {
    pending: "To do",
    in_progress: "In progress",
    cancelled: "Blocked",
    completed: "Done",
}

const STATUS_TONE: Record<TaskStatus, Tone> = {
    pending: "neutral",
    in_progress: "primary",
    cancelled: "warning",
    completed: "success",
}

const PRIORITY_ORDER: TaskPriority[] = ["high", "medium", "low"]

const PRIORITY_LABEL: Record<TaskPriority, string> = {
    high: "High",
    medium: "Medium",
    low: "Low",
}

const PRIORITY_TONE: Record<TaskPriority, Tone> = {
    high: "warning",
    medium: "primary",
    low: "muted",
}

const PRIORITY_RANK: Record<TaskPriority, number> = {
    high: 0,
    medium: 1,
    low: 2,
}

type Scope = "all" | "mine" | "reported"

const SCOPES: Array<{ key: Scope; label: string }> = [
    { key: "all", label: "All tasks" },
    { key: "mine", label: "Assigned to me" },
    { key: "reported", label: "Reported by me" },
]

export function TasksClient({ tasks, currentUserId, profiles }: TasksClientProps) {
    const [scope, setScope] = useState<Scope>("all")
    const [statusFilter, setStatusFilter] = useState<TaskStatus | null>(null)
    const [priorityFilter, setPriorityFilter] = useState<TaskPriority | null>(null)
    const [tagFilter, setTagFilter] = useState<string | null>(null)
    const [search, setSearch] = useState("")
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
    const [creating, setCreating] = useState(false)

    const profilesById = useMemo(() => {
        return new Map(profiles.map((profile) => [profile.id, profile]))
    }, [profiles])

    const allTags = useMemo(() => {
        const set = new Set<string>()
        for (const task of tasks) {
            for (const tag of normalizeTags(task)) set.add(tag)
        }
        return Array.from(set).sort((a, b) => a.localeCompare(b))
    }, [tasks])

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()

        return tasks.filter((task) => {
            const status = normalizeStatus(task.status)
            const priority = normalizePriority(task.priority)
            const tags = normalizeTags(task)

            if (scope === "mine" && task.assigned_to !== currentUserId) return false
            if (scope === "reported" && task.created_by !== currentUserId) return false
            if (statusFilter && status !== statusFilter) return false
            if (priorityFilter && priority !== priorityFilter) return false
            if (tagFilter && !tags.includes(tagFilter)) return false
            if (q) {
                const haystack = [
                    task.title,
                    task.description,
                    task.workspace_task_id,
                    tags.join(" "),
                    task.assignee?.full_name,
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase()

                if (!haystack.includes(q)) return false
            }

            return true
        })
    }, [
        currentUserId,
        priorityFilter,
        scope,
        search,
        statusFilter,
        tagFilter,
        tasks,
    ])

    const grouped = useMemo(() => {
        const groups: Record<TaskStatus, Task[]> = {
            pending: [],
            in_progress: [],
            cancelled: [],
            completed: [],
        }

        for (const task of filtered) groups[normalizeStatus(task.status)].push(task)

        for (const status of STATUS_ORDER) {
            groups[status].sort((a, b) => {
                const priority =
                    PRIORITY_RANK[normalizePriority(a.priority)] -
                    PRIORITY_RANK[normalizePriority(b.priority)]
                if (priority !== 0) return priority

                const aDue = a.due_date ? new Date(a.due_date).getTime() : Infinity
                const bDue = b.due_date ? new Date(b.due_date).getTime() : Infinity
                return aDue - bDue
            })
        }

        return groups
    }, [filtered])

    const counts = useMemo(
        () => ({
            all: tasks.length,
            mine: tasks.filter((task) => task.assigned_to === currentUserId).length,
            reported: tasks.filter((task) => task.created_by === currentUserId).length,
        }),
        [currentUserId, tasks]
    )

    const selectedTask =
        tasks.find((task) => task.id === selectedTaskId) ??
        filtered.find((task) => task.id === selectedTaskId) ??
        null

    const hasActiveFilter =
        statusFilter !== null ||
        priorityFilter !== null ||
        tagFilter !== null ||
        search.trim() !== ""

    return (
        <div className="min-h-full bg-surface-canvas px-5 py-10 text-foreground sm:px-8 lg:px-12">
            <div className="mx-auto max-w-[1200px]">
                <header className="flex items-start justify-between gap-6">
                    <div className="max-w-[520px]">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            Tasks
                        </div>
                        <h1 className="mt-2 font-serif text-[34px] font-normal leading-none tracking-normal text-foreground">
                            The work to <em className="italic">be done</em>
                        </h1>
                        <p className="mt-3 text-[14px] leading-6 text-muted-foreground">
                            Every commitment, follow-up, and ministering nudge - assigned,
                            prioritized, and out of your head.
                        </p>
                    </div>

                    <Button
                        onClick={() => setCreating(true)}
                        className="mt-9 h-9 rounded-[8px] bg-brand px-4 text-[12.5px] font-medium text-brand-foreground hover:bg-[hsl(var(--brand-hover))]"
                    >
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        New task
                    </Button>
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
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search tasks..."
                            className="h-8 w-[240px] rounded-[8px] border-border/70 bg-surface-sunken pl-8 text-[12.5px]"
                        />
                    </div>

                    <FilterMenu
                        label="Status"
                        value={statusFilter}
                        options={STATUS_ORDER.map((status) => ({
                            value: status,
                            label: STATUS_LABEL[status],
                        }))}
                        onChange={(value) => setStatusFilter(value as TaskStatus | null)}
                    />
                    <FilterMenu
                        label="Priority"
                        value={priorityFilter}
                        options={PRIORITY_ORDER.map((priority) => ({
                            value: priority,
                            label: PRIORITY_LABEL[priority],
                        }))}
                        onChange={(value) =>
                            setPriorityFilter(value as TaskPriority | null)
                        }
                    />
                    <FilterMenu
                        label="Tag"
                        value={tagFilter}
                        options={allTags.map((tag) => ({
                            value: tag,
                            label: `#${tag}`,
                        }))}
                        onChange={setTagFilter}
                    />

                    {hasActiveFilter ? (
                        <button
                            type="button"
                            onClick={() => {
                                setSearch("")
                                setStatusFilter(null)
                                setPriorityFilter(null)
                                setTagFilter(null)
                            }}
                            className="ml-1 inline-flex items-center gap-1 text-[11.5px] text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-3 w-3" />
                            Clear
                        </button>
                    ) : null}

                    <div className="ml-auto text-[11.5px] tabular-nums text-muted-foreground">
                        {filtered.length} of {tasks.length}
                    </div>
                </div>

                <main className="mt-8">
                    {filtered.length === 0 ? (
                        <EmptyState onCreate={() => setCreating(true)} />
                    ) : (
                        <div className="space-y-8">
                            {STATUS_ORDER.map((status) => {
                                const list = grouped[status]
                                if (list.length === 0) return null

                                return (
                                    <section key={status}>
                                        <div className="mb-3 flex items-center gap-3 px-1">
                                            <Pill tone={STATUS_TONE[status]} dot>
                                                {STATUS_LABEL[status]}
                                            </Pill>
                                            <span className="text-[11px] tabular-nums text-muted-foreground">
                                                {list.length}
                                            </span>
                                        </div>
                                        <ul className="overflow-hidden rounded-[8px] border border-border/70 bg-background">
                                            {list.map((task, index) => (
                                                <TaskRow
                                                    key={task.id}
                                                    task={task}
                                                    profilesById={profilesById}
                                                    isLast={index === list.length - 1}
                                                    onOpen={() => setSelectedTaskId(task.id)}
                                                />
                                            ))}
                                        </ul>
                                    </section>
                                )
                            })}
                        </div>
                    )}
                </main>
            </div>

            <NewTaskDialog
                open={creating}
                profiles={profiles}
                currentUserId={currentUserId}
                onOpenChange={setCreating}
                onCreated={(id) => setSelectedTaskId(id)}
            />
            <TaskDetailSheet
                task={selectedTask}
                profiles={profiles}
                open={Boolean(selectedTask)}
                onOpenChange={(open) => {
                    if (!open) setSelectedTaskId(null)
                }}
            />
        </div>
    )
}

function TaskRow({
    task,
    profilesById,
    isLast,
    onOpen,
}: {
    task: Task
    profilesById: Map<string, Profile>
    isLast: boolean
    onOpen: () => void
}) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const status = normalizeStatus(task.status)
    const priority = normalizePriority(task.priority)
    const tags = normalizeTags(task)
    const done = status === "completed"
    const assignee = task.assigned_to
        ? profilesById.get(task.assigned_to)
        : task.assignee?.full_name
          ? { id: "assignee", full_name: task.assignee.full_name }
          : null
    const reporter = task.created_by ? profilesById.get(task.created_by) : null
    const dueTone = dueDateTone(task.due_date, done)

    function toggleDone(checked: boolean) {
        startTransition(async () => {
            const result = await updateTask(task.id, {
                status: checked ? "completed" : "pending",
            })
            if (result.error) {
                toast.error("Failed to update task", { description: result.error })
                return
            }
            router.refresh()
        })
    }

    return (
        <li
            className={cn(
                "group grid cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 transition-colors hover:bg-surface-hover/70",
                !isLast && "border-b border-border/60"
            )}
            onClick={onOpen}
        >
            <div onClick={(event) => event.stopPropagation()}>
                <Checkbox
                    checked={done}
                    disabled={isPending}
                    onCheckedChange={(checked) => toggleDone(checked === true)}
                    className="border-brand text-brand-foreground data-[state=checked]:border-brand data-[state=checked]:bg-brand"
                />
            </div>

            <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                    <span
                        className={cn(
                            "truncate text-[13.5px] text-foreground",
                            done && "text-muted-foreground line-through"
                        )}
                    >
                        {task.title}
                    </span>
                    {task.description ? (
                        <MessageSquare className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                    ) : null}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Pill tone={STATUS_TONE[status]} dot>
                        {STATUS_LABEL[status]}
                    </Pill>
                    <Pill tone={PRIORITY_TONE[priority]}>{PRIORITY_LABEL[priority]}</Pill>
                    {tags.slice(0, 3).map((tag) => (
                        <span
                            key={tag}
                            className="rounded-[4px] border border-border/70 bg-surface-raised px-1.5 py-px text-[10.5px] text-muted-foreground"
                        >
                            #{tag}
                        </span>
                    ))}
                    {tags.length > 3 ? (
                        <span className="text-[10.5px] text-muted-foreground">
                            +{tags.length - 3}
                        </span>
                    ) : null}
                </div>
            </div>

            <div className="flex shrink-0 items-center gap-4">
                {task.due_date ? (
                    <Pill tone={dueTone}>
                        <CalendarClock className="h-3 w-3" />
                        {formatDue(task.due_date)}
                    </Pill>
                ) : null}
                <div
                    className="flex items-center -space-x-1.5"
                    title={`Reporter: ${displayName(reporter) || "-"} · Assignee: ${displayName(assignee) || "-"}`}
                >
                    {reporter ? <PersonAvatar profile={reporter} size="sm" muted /> : null}
                    {assignee ? <PersonAvatar profile={assignee} size="md" /> : null}
                </div>
            </div>
        </li>
    )
}

function NewTaskDialog({
    open,
    onOpenChange,
    onCreated,
    currentUserId,
    profiles,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    onCreated?: (id: string) => void
    currentUserId: string
    profiles: Profile[]
}) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [status, setStatus] = useState<TaskStatus>("pending")
    const [priority, setPriority] = useState<TaskPriority>("medium")
    const [assignee, setAssignee] = useState(currentUserId)
    const [dueDate, setDueDate] = useState<Date | undefined>()
    const [tagsInput, setTagsInput] = useState("")

    const currentUser = profiles.find((profile) => profile.id === currentUserId)

    function reset() {
        setTitle("")
        setDescription("")
        setStatus("pending")
        setPriority("medium")
        setAssignee(currentUserId)
        setDueDate(undefined)
        setTagsInput("")
    }

    function submit() {
        if (!title.trim()) return

        startTransition(async () => {
            const result = await createTask({
                title: title.trim(),
                description: description.trim() || undefined,
                assigned_to: assignee || undefined,
                due_date: dueDate ? format(dueDate, "yyyy-MM-dd") : undefined,
                priority,
                status,
                tags: parseTags(tagsInput),
            })

            if (result.error) {
                toast.error("Failed to create task", { description: result.error })
                return
            }

            toast.success("Task created.")
            reset()
            onOpenChange(false)
            router.refresh()
            if (result.data?.id) onCreated?.(result.data.id)
        })
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
                onOpenChange(nextOpen)
                if (!nextOpen) reset()
            }}
        >
            <DialogContent className="max-w-[560px] gap-0 overflow-hidden rounded-[8px] border-border/80 bg-background p-0 shadow-2xl">
                <DialogHeader className="px-6 pb-3 pt-5">
                    <div className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                        New task
                    </div>
                    <DialogTitle className="font-serif text-2xl font-normal italic leading-none tracking-normal">
                        What needs to happen?
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        Create a new task and assign it.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 px-6 pb-5">
                    <Input
                        autoFocus
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        placeholder="Task title"
                        className="h-10 rounded-[8px] border-border/80 bg-surface-sunken text-[14px]"
                    />
                    <Textarea
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        placeholder="Description (optional)"
                        rows={4}
                        className="resize-none rounded-[8px] border-border/80 bg-surface-sunken text-[13px] leading-relaxed"
                    />

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Field label="Status">
                            <Select
                                value={status}
                                onValueChange={(value) => setStatus(value as TaskStatus)}
                            >
                                <SelectTrigger className="h-9 bg-surface-sunken text-[12.5px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {STATUS_ORDER.map((item) => (
                                        <SelectItem key={item} value={item} className="text-[12.5px]">
                                            {STATUS_LABEL[item]}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>

                        <Field label="Priority">
                            <Select
                                value={priority}
                                onValueChange={(value) => setPriority(value as TaskPriority)}
                            >
                                <SelectTrigger className="h-9 bg-surface-sunken text-[12.5px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {PRIORITY_ORDER.map((item) => (
                                        <SelectItem key={item} value={item} className="text-[12.5px]">
                                            {PRIORITY_LABEL[item]}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>

                        <Field label="Assignee">
                            <Select value={assignee} onValueChange={setAssignee}>
                                <SelectTrigger className="h-9 bg-surface-sunken text-[12.5px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {profiles.map((profile) => (
                                        <SelectItem key={profile.id} value={profile.id} className="text-[12.5px]">
                                            {displayName(profile)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>

                        <Field label="Reporter">
                            <div className="flex h-9 items-center rounded-[8px] border border-border bg-surface-sunken px-3 text-[12.5px] text-foreground">
                                {displayName(currentUser) || "Current user"}
                            </div>
                        </Field>

                        <Field label="Due date">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className={cn(
                                            "h-9 w-full justify-start rounded-[8px] border border-border bg-surface-sunken px-3 text-left text-[12.5px] font-normal",
                                            !dueDate && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-3.5 w-3.5 opacity-70" />
                                        {dueDate ? format(dueDate, "PPP") : "No due date"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={dueDate}
                                        onSelect={setDueDate}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </Field>

                        <Field label="Tags">
                            <Input
                                value={tagsInput}
                                onChange={(event) => setTagsInput(event.target.value)}
                                placeholder="comma, separated"
                                className="h-9 rounded-[8px] border-border/80 bg-surface-sunken text-[12.5px]"
                            />
                        </Field>
                    </div>
                </div>

                <DialogFooter className="border-t border-border/70 px-6 py-4">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                            reset()
                            onOpenChange(false)
                        }}
                        className="text-[12.5px]"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={submit}
                        disabled={!title.trim() || isPending}
                        className="rounded-[8px] bg-brand px-4 text-[12.5px] text-brand-foreground hover:bg-[hsl(var(--brand-hover))]"
                    >
                        Create task
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function TaskDetailSheet({
    task,
    open,
    onOpenChange,
    profiles,
}: {
    task: Task | null
    open: boolean
    onOpenChange: (open: boolean) => void
    profiles: Profile[]
}) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [tagsInput, setTagsInput] = useState("")

    useEffect(() => {
        if (!task) return
        setTitle(task.title)
        setDescription(task.description ?? "")
        setTagsInput(normalizeTags(task).join(", "))
    }, [task])

    if (!task) return null

    const currentTask = task
    const status = normalizeStatus(task.status)
    const priority = normalizePriority(task.priority)
    const dueDate = task.due_date ? new Date(`${task.due_date}T00:00:00`) : undefined

    function save(update: Parameters<typeof updateTask>[1]) {
        startTransition(async () => {
            const result = await updateTask(currentTask.id, update)
            if (result.error) {
                toast.error("Failed to update task", { description: result.error })
                return
            }
            router.refresh()
        })
    }

    function remove() {
        startTransition(async () => {
            const result = await deleteTask(currentTask.id)
            if (result.error) {
                toast.error("Failed to delete task", { description: result.error })
                return
            }
            toast.success("Task deleted.")
            onOpenChange(false)
            router.refresh()
        })
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="flex w-full flex-col gap-0 border-border/80 bg-background p-0 sm:max-w-[520px]"
            >
                <SheetHeader className="flex-row items-start justify-between space-y-0 border-b border-border/70 px-6 pb-4 pt-5">
                    <div className="min-w-0 flex-1 pr-12">
                        <div className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                            Task
                        </div>
                        <SheetTitle className="sr-only">{task.title}</SheetTitle>
                        <Input
                            value={title}
                            onChange={(event) => setTitle(event.target.value)}
                            onBlur={() => {
                                const next = title.trim()
                                if (next && next !== task.title) save({ title: next })
                            }}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") event.currentTarget.blur()
                            }}
                            className="h-auto border-0 bg-transparent px-0 py-0 font-serif text-[18px] font-normal italic focus-visible:ring-0"
                        />
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={isPending}
                        onClick={remove}
                        className="mr-7 h-8 w-8 text-muted-foreground hover:text-destructive"
                        aria-label="Delete task"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </SheetHeader>

                <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
                    <div className="grid grid-cols-[110px_1fr] items-center gap-x-4 gap-y-3 text-[12.5px]">
                        <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                            Status
                        </span>
                        <Select
                            value={status}
                            onValueChange={(value) => save({ status: value as TaskStatus })}
                        >
                            <SelectTrigger className="h-8 w-fit min-w-[150px] bg-surface-sunken text-[12.5px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {STATUS_ORDER.map((item) => (
                                    <SelectItem key={item} value={item} className="text-[12.5px]">
                                        {STATUS_LABEL[item]}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                            Priority
                        </span>
                        <Select
                            value={priority}
                            onValueChange={(value) => save({ priority: value as TaskPriority })}
                        >
                            <SelectTrigger className="h-8 w-fit min-w-[150px] bg-surface-sunken text-[12.5px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {PRIORITY_ORDER.map((item) => (
                                    <SelectItem key={item} value={item} className="text-[12.5px]">
                                        {PRIORITY_LABEL[item]}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                            Assignee
                        </span>
                        <Select
                            value={task.assigned_to ?? "unassigned"}
                            onValueChange={(value) =>
                                save({ assigned_to: value === "unassigned" ? null : value })
                            }
                        >
                            <SelectTrigger className="h-8 w-fit min-w-[180px] bg-surface-sunken text-[12.5px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="unassigned" className="text-[12.5px]">
                                    Unassigned
                                </SelectItem>
                                {profiles.map((profile) => (
                                    <SelectItem key={profile.id} value={profile.id} className="text-[12.5px]">
                                        {displayName(profile)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                            Due date
                        </span>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className={cn(
                                        "h-8 w-fit min-w-[150px] justify-start rounded-[8px] border border-border bg-surface-sunken px-2.5 text-left text-[12.5px] font-normal",
                                        !dueDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-3.5 w-3.5 opacity-70" />
                                    {dueDate ? format(dueDate, "PPP") : "No due date"}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={dueDate}
                                    onSelect={(date) =>
                                        save({
                                            due_date: date ? format(date, "yyyy-MM-dd") : null,
                                        })
                                    }
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>

                        <span className="self-start pt-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                            Tags
                        </span>
                        <Input
                            value={tagsInput}
                            onChange={(event) => setTagsInput(event.target.value)}
                            onBlur={() => save({ tags: parseTags(tagsInput) })}
                            placeholder="comma, separated, tags"
                            className="h-8 bg-surface-sunken text-[12.5px]"
                        />
                    </div>

                    <div>
                        <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                            Description
                        </div>
                        <Textarea
                            value={description}
                            onChange={(event) => setDescription(event.target.value)}
                            onBlur={() => {
                                if (description !== (task.description ?? "")) {
                                    save({ description: description.trim() || undefined })
                                }
                            }}
                            placeholder="Add detail, context, or links..."
                            rows={6}
                            className="resize-none bg-surface-sunken text-[13px] leading-relaxed"
                        />
                    </div>

                    <div className="border-t border-border/70 pt-3 text-[11.5px] text-muted-foreground">
                        Created {format(new Date(task.created_at), "MMM d, yyyy 'at' h:mm a")}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
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
    const current = options.find((option) => option.value === value)
    const active = value !== null

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen((currentOpen) => !currentOpen)}
                className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-[11.5px] transition-colors",
                    active
                        ? "border-brand/40 bg-brand/10 text-brand"
                        : "border-border/70 bg-background text-muted-foreground hover:text-foreground"
                )}
            >
                <span className="opacity-80">{label}:</span>
                <span>{current?.label ?? "Any"}</span>
            </button>
            {open ? (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div className="absolute left-0 top-full z-50 mt-1.5 min-w-[180px] overflow-hidden rounded-[8px] border border-border/80 bg-popover shadow-lg">
                        <button
                            type="button"
                            onClick={() => {
                                onChange(null)
                                setOpen(false)
                            }}
                            className={cn(
                                "w-full px-3 py-2 text-left text-[12px] hover:bg-surface-hover",
                                value === null && "text-brand"
                            )}
                        >
                            Any {label.toLowerCase()}
                        </button>
                        <div className="h-px bg-border/70" />
                        {options.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => {
                                    onChange(option.value)
                                    setOpen(false)
                                }}
                                className={cn(
                                    "w-full px-3 py-2 text-left text-[12px] hover:bg-surface-hover",
                                    value === option.value && "text-brand"
                                )}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </>
            ) : null}
        </div>
    )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
    return (
        <div className="rounded-[8px] border border-border/70 bg-background px-6 py-16 text-center">
            <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                <ListTodo className="h-5 w-5 text-muted-foreground" />
            </span>
            <h3 className="font-serif text-xl font-normal">No tasks here</h3>
            <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-muted-foreground">
                Try clearing filters, or create the first task to delegate.
            </p>
            <Button
                onClick={onCreate}
                className="mt-5 h-8 rounded-[8px] bg-brand text-[12.5px] text-brand-foreground hover:bg-[hsl(var(--brand-hover))]"
            >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                New task
            </Button>
        </div>
    )
}

function Field({
    label,
    children,
}: {
    label: string
    children: React.ReactNode
}) {
    return (
        <div>
            <div className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {label}
            </div>
            {children}
        </div>
    )
}

function Pill({
    tone,
    dot,
    children,
}: {
    tone: Tone
    dot?: boolean
    children: React.ReactNode
}) {
    const toneClass: Record<Tone, string> = {
        neutral: "border-border/80 bg-surface-raised text-muted-foreground",
        primary: "border-brand/30 bg-brand/10 text-brand",
        success: "border-emerald-500/25 bg-emerald-500/10 text-emerald-500",
        warning: "border-amber-500/30 bg-amber-500/10 text-amber-500",
        danger: "border-red-500/30 bg-red-500/10 text-red-500",
        muted: "border-border/70 bg-surface-raised text-muted-foreground",
    }

    return (
        <span
            className={cn(
                "inline-flex h-[22px] items-center gap-1.5 rounded-full border px-2 text-[11px] font-medium leading-none",
                toneClass[tone]
            )}
        >
            {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current" /> : null}
            {children}
        </span>
    )
}

function PersonAvatar({
    profile,
    size,
    muted,
}: {
    profile: Profile
    size: "sm" | "md"
    muted?: boolean
}) {
    return (
        <Avatar
            className={cn(
                "border-2 border-background",
                size === "sm" ? "h-[22px] w-[22px]" : "h-6 w-6",
                muted && "opacity-70"
            )}
        >
            <AvatarFallback
                className={cn(
                    "bg-brand/20 text-[9px] font-medium text-brand",
                    muted && "bg-amber-500/15 text-amber-500"
                )}
            >
                {initials(displayName(profile))}
            </AvatarFallback>
        </Avatar>
    )
}

function normalizeStatus(status: string | null | undefined): TaskStatus {
    if (status === "in_progress") return "in_progress"
    if (status === "completed") return "completed"
    if (status === "cancelled") return "cancelled"
    return "pending"
}

function normalizePriority(priority: string | null | undefined): TaskPriority {
    if (priority === "high" || priority === "low") return priority
    return "medium"
}

function normalizeTags(task: Task) {
    if (Array.isArray(task.tags)) return task.tags.filter(Boolean)
    if (Array.isArray(task.labels)) return task.labels.map((label) => label.name)
    return []
}

function parseTags(value: string) {
    return value
        .split(",")
        .map((tag) => tag.trim().replace(/^#/, ""))
        .filter(Boolean)
}

function displayName(profile: Profile | null | undefined) {
    return profile?.full_name?.trim() || profile?.email || ""
}

function initials(name: string) {
    const parts = name.trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return "?"
    return parts
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("")
}

function dueDateTone(
    dueDate: string | null | undefined,
    done: boolean
): Tone {
    if (!dueDate || done) return "muted"
    const due = new Date(`${dueDate}T00:00:00`)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate())
    const diff = dueDay.getTime() - today.getTime()

    if (diff < 0) return "danger"
    if (diff <= 3 * 24 * 60 * 60 * 1000) return "warning"
    return "muted"
}

function formatDue(dueDate: string) {
    const date = new Date(`${dueDate}T00:00:00`)
    const now = new Date()
    return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        ...(date.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
    })
}
