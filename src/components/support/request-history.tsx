"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { AlertCircle, Loader2 } from "lucide-react"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Ticket {
    key: string
    summary: string
    status: string
    statusColor: string
    created: string
    updated: string
    type: string
}

export function RequestHistory() {
    const [tickets, setTickets] = useState<Ticket[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    const fetchTickets = async () => {
        setLoading(true)
        setError("")
        try {
            const response = await fetch("/api/support/my-tickets")
            if (!response.ok) {
                throw new Error("Failed to fetch tickets")
            }
            const data = await response.json()
            setTickets(data.tickets || [])
        } catch (err) {
            console.error(err)
            setError("Failed to load your request history. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchTickets()
    }, [])

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mb-2" />
                <p>Loading your requests...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-4">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
                <div className="mt-4 flex justify-center">
                    <Button variant="outline" onClick={fetchTickets}>Try Again</Button>
                </div>
            </div>
        )
    }

    if (tickets.length === 0) {
        return (
            <div className="text-center p-8 text-muted-foreground">
                <p>You haven&apos;t submitted any requests yet.</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[100px]">ID</TableHead>
                            <TableHead>Subject</TableHead>
                            <TableHead className="w-[120px]">Status</TableHead>
                            <TableHead className="w-[120px] text-right">Date</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tickets.map((ticket) => (
                            <TableRow key={ticket.key}>
                                <TableCell className="font-medium text-xs text-muted-foreground">
                                    {ticket.key}
                                </TableCell>
                                <TableCell>
                                    <div className="font-medium truncate max-w-[200px] sm:max-w-[300px]" title={ticket.summary}>
                                        {ticket.summary}
                                    </div>
                                    <div className="text-xs text-muted-foreground hidden sm:block">
                                        {ticket.type}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <StatusBadge status={ticket.status} />
                                </TableCell>
                                <TableCell className="text-right text-xs text-muted-foreground">
                                    {format(new Date(ticket.created), "MMM d, yyyy")}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}

function StatusBadge({ status }: { status: string }) {
    // Map Jira status colors to our UI colors if needed, or use simple logic
    let variant: "default" | "secondary" | "destructive" | "outline" = "outline";

    // Simple heuristic for badge variants based on common Jira statuses
    const lowerStatus = status.toLowerCase();
    if (lowerStatus.includes("done") || lowerStatus.includes("resolved") || lowerStatus.includes("closed")) {
        variant = "secondary"; // Green-ish usually, or grey for closed
    } else if (lowerStatus.includes("progress")) {
        variant = "default"; // Blue/Primary
    } else if (lowerStatus.includes("review")) {
        variant = "outline";
    }

    // Determine color class based on variant if we want more specific control
    // For now, relying on Shadcn Badge variants is clean.

    return <Badge variant={variant} className="whitespace-nowrap">{status}</Badge>
}
