"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { ArrowLeft, Loader2, MessageSquare, User } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"

interface Comment {
    id: string
    author: string
    body: string // HTML or text
    created: string
    isSupport: boolean
}

interface TicketDetailData {
    key: string
    summary: string
    description: string // HTML or text
    status: string
    statusColor: string
    created: string
    updated: string
    comments: Comment[]
}

interface TicketDetailProps {
    ticketKey: string
    onBack: () => void
}

export function TicketDetail({ ticketKey, onBack }: TicketDetailProps) {
    const [ticket, setTicket] = useState<TicketDetailData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [reply, setReply] = useState("")
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        const fetchTicket = async () => {
            setLoading(true)
            try {
                const response = await fetch(`/api/support/tickets/${ticketKey}`)
                if (!response.ok) {
                    throw new Error("Failed to fetch ticket details")
                }
                const data = await response.json()
                setTicket(data)
            } catch (err) {
                console.error(err)
                setError("Failed to load ticket details.")
            } finally {
                setLoading(false)
            }
        }

        if (ticketKey) {
            fetchTicket()
        }
    }, [ticketKey])

    const handleReply = async () => {
        if (!reply.trim()) return

        setSubmitting(true)
        try {
            const response = await fetch(`/api/support/tickets/${ticketKey}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ comment: reply })
            })

            if (!response.ok) {
                throw new Error("Failed to post reply")
            }

            setReply("")
            // Re-fetch ticket details to show new comment
            // We could optimise this by appending to local state, but re-fetching ensures we get the rendered HTML
            // Note: Jira API might have a slight delay in indexing, but usually OK for direct retrieval?
            // Actually, let's just re-fetch.
            // We need to call fetchTicket again, but it currently sets loading=true which flashes the UI.
            // Let's modify fetchTicket to accept a 'silent' param or duplicate the logic for refresh.

            // Re-fetching without full page reload
            const refreshResponse = await fetch(`/api/support/tickets/${ticketKey}`)
            if (refreshResponse.ok) {
                const data = await refreshResponse.json()
                setTicket(data)
            }

        } catch (err) {
            console.error(err)
            // Ideally show a toast here
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-muted-foreground h-full">
                <Loader2 className="h-8 w-8 animate-spin mb-4" />
                <p>Loading details...</p>
            </div>
        )
    }

    if (error || !ticket) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center h-full space-y-4">
                <p className="text-destructive">{error || "Ticket not found"}</p>
                <Button variant="outline" onClick={onBack}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to List
                </Button>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full bg-background">
            <div className="flex items-center gap-2 p-4 border-b">
                <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{ticket.summary}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{ticket.key}</span>
                        <span>•</span>
                        <span>{format(new Date(ticket.created), "MMM d, yyyy")}</span>
                    </div>
                </div>
                <StatusBadge status={ticket.status} />
            </div>

            <ScrollArea className="flex-1">
                <div className="p-6 space-y-8">
                    {/* Description Section */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Description</h4>
                        <div
                            className="prose prose-sm dark:prose-invert max-w-none text-foreground"
                            dangerouslySetInnerHTML={{ __html: ticket.description }}
                        />
                    </div>

                    <Separator />

                    {/* Comments / Activity Section */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-muted-foreground" />
                            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Activity</h4>
                        </div>

                        {/* Reply Form */}
                        <div className="space-y-4">
                            <Textarea
                                placeholder="Type your reply here..."
                                value={reply}
                                onChange={(e) => setReply(e.target.value)}
                                className="min-h-[100px]"
                            />
                            <div className="flex justify-end">
                                <Button
                                    onClick={handleReply}
                                    disabled={!reply.trim() || submitting}
                                >
                                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Send Reply
                                </Button>
                            </div>
                        </div>

                        <Separator />

                        {ticket.comments.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">No comments yet.</p>
                        ) : (
                            <div className="space-y-6">
                                {ticket.comments.map((comment) => (
                                    <div key={comment.id} className="flex gap-4">
                                        <Avatar className="h-8 w-8 border">
                                            <AvatarFallback className={comment.isSupport ? "bg-primary text-primary-foreground" : ""}>
                                                {comment.isSupport ? "SP" : <User className="h-4 w-4" />}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium">
                                                    {comment.author} {comment.isSupport && <Badge variant="secondary" className="ml-2 text-[10px] h-5">Support</Badge>}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {format(new Date(comment.created), "MMM d, h:mm a")}
                                                </span>
                                            </div>
                                            <div
                                                className="text-sm text-foreground/90 prose prose-sm dark:prose-invert max-w-none"
                                                dangerouslySetInnerHTML={{ __html: comment.body }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </ScrollArea>
        </div>
    )
}

function StatusBadge({ status }: { status: string }) {
    let variant: "default" | "secondary" | "destructive" | "outline" = "outline";
    const lowerStatus = status.toLowerCase();

    if (lowerStatus.includes("done") || lowerStatus.includes("resolved") || lowerStatus.includes("closed")) {
        variant = "secondary";
    } else if (lowerStatus.includes("progress")) {
        variant = "default";
    }

    return <Badge variant={variant}>{status}</Badge>
}
