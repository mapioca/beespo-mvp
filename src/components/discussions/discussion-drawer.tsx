"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
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
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet"
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
import { MessagesSquare, Trash2, ExternalLink } from "lucide-react"
import { format } from "date-fns"
import { createClient } from "@/lib/supabase/client"
import { toast } from "@/lib/toast"
import { useRouter } from "next/navigation"
import type { Discussion } from "./discussions-table"

const CATEGORY_OPTIONS = [
    { value: "general", label: "General" },
    { value: "budget", label: "Budget" },
    { value: "personnel", label: "Personnel" },
    { value: "programs", label: "Programs" },
    { value: "facilities", label: "Facilities" },
    { value: "welfare", label: "Welfare" },
    { value: "youth", label: "Youth" },
    { value: "activities", label: "Activities" },
]

const STATUS_OPTIONS = [
    { value: "new", label: "New" },
    { value: "active", label: "Active" },
    { value: "decision_required", label: "Decision Required" },
    { value: "monitoring", label: "Monitoring" },
    { value: "resolved", label: "Resolved" },
    { value: "deferred", label: "Deferred" },
]

const PRIORITY_OPTIONS = [
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" },
]

interface DiscussionDrawerProps {
    discussion: Discussion | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onDelete: (id: string) => Promise<void>
}

export function DiscussionDrawer({ discussion, open, onOpenChange, onDelete }: DiscussionDrawerProps) {
    const router = useRouter()
    const [isSaving, setIsSaving] = useState(false)
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    // Editable fields
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [category, setCategory] = useState("general")
    const [status, setStatus] = useState("new")
    const [priority, setPriority] = useState("medium")
    const [dueDate, setDueDate] = useState("")

    useEffect(() => {
        if (discussion) {
            setTitle(discussion.title)
            setDescription(discussion.description ?? "")
            setCategory(discussion.category)
            setStatus(discussion.status)
            setPriority(discussion.priority)
            setDueDate(discussion.due_date?.split("T")[0] ?? "")
        }
    }, [discussion])

    const creatorName = discussion?.creator?.full_name

    const handleSave = async () => {
        if (!discussion || !title.trim()) return
        setIsSaving(true)
        const supabase = createClient()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from("discussions") as any)
            .update({
                title: title.trim(),
                description: description.trim() || null,
                category,
                status,
                priority,
                due_date: dueDate || null,
            })
            .eq("id", discussion.id)

        if (error) {
            toast.error(error.message)
        } else {
            toast.success("Discussion updated.")
            router.refresh()
        }
        setIsSaving(false)
    }

    const handleDelete = async () => {
        if (!discussion) return
        setIsDeleting(true)
        await onDelete(discussion.id)
        setIsDeleting(false)
        setShowDeleteDialog(false)
        onOpenChange(false)
    }

    return (
        <>
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent className="w-full sm:max-w-sm flex flex-col gap-0 p-0 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 pt-4 pb-3 pr-12 shrink-0">
                        <div className="flex items-center gap-2">
                            <MessagesSquare className="h-4 w-4 text-muted-foreground" />
                            <SheetTitle className="text-sm font-semibold">Discussion Details</SheetTitle>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setShowDeleteDialog(true)}
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                    <SheetDescription className="sr-only">
                        Discussion details for {discussion?.title}
                    </SheetDescription>

                    <Separator />

                    {/* Scrollable body */}
                    <div className="flex-1 overflow-y-auto">
                        {/* DISCUSSION section */}
                        <div className="px-5 py-4 space-y-4">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                                Discussion
                            </p>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium">Title</label>
                                <Input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="h-8 text-sm"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium">Description</label>
                                <Textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Discussion description..."
                                    className="text-sm resize-none"
                                    rows={4}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium">Category</label>
                                <Select value={category} onValueChange={setCategory}>
                                    <SelectTrigger className="h-8 text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CATEGORY_OPTIONS.map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <Separator />

                        {/* DETAILS section */}
                        <div className="px-5 py-4 space-y-4">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                                Details
                            </p>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium">Status</label>
                                <Select value={status} onValueChange={setStatus}>
                                    <SelectTrigger className="h-8 text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {STATUS_OPTIONS.map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium">Priority</label>
                                <Select value={priority} onValueChange={setPriority}>
                                    <SelectTrigger className="h-8 text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PRIORITY_OPTIONS.map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium">Due Date</label>
                                <Input
                                    type="date"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                    className="h-8 text-sm"
                                />
                            </div>
                            {discussion && (
                                <div className="flex items-start justify-between gap-4">
                                    <span className="text-xs text-muted-foreground shrink-0">Created at</span>
                                    <span className="text-xs text-right">
                                        {format(new Date(discussion.created_at), "MMM d, yyyy 'at' h:mm a")}
                                    </span>
                                </div>
                            )}
                            {creatorName && (
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground">Created by</span>
                                    <span className="text-xs">{creatorName}</span>
                                </div>
                            )}
                        </div>

                        <Separator />

                        {/* QUICK ACTIONS section */}
                        <div className="px-5 py-4 space-y-2">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                                Quick Actions
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full justify-start gap-2 h-8 text-xs font-normal"
                                asChild
                            >
                                <Link href={`/meetings/discussions/${discussion?.id}`}>
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    View Full Details
                                </Link>
                            </Button>
                        </div>
                    </div>

                    {/* Footer */}
                    <Separator />
                    <div className="px-5 py-4 shrink-0">
                        <Button
                            onClick={handleSave}
                            disabled={isSaving || !title.trim()}
                            className="w-full h-8 text-xs"
                        >
                            {isSaving ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Discussion</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete &quot;{discussion?.title}&quot;? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
