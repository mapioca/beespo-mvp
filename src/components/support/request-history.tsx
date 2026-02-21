"use client"

import { useCallback, useEffect, useState } from "react"
import { format } from "date-fns"
import { AlertCircle, Loader2, MessageSquare } from "lucide-react"
import { useTranslations } from "next-intl"

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
import { TicketDetail } from "./ticket-detail"

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
    const t = useTranslations("Tables.requestHistory")
    const [tickets, setTickets] = useState<Ticket[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [selectedTicketKey, setSelectedTicketKey] = useState<string | null>(null)

    const fetchTickets = useCallback(async () => {
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
            setError(t("errorLoading"))
        } finally {
            setLoading(false)
        }
    }, [t])

    useEffect(() => {
        fetchTickets()
    }, [fetchTickets])

    if (selectedTicketKey) {
        return (
            <TicketDetail
                ticketKey={selectedTicketKey}
                onBack={() => setSelectedTicketKey(null)}
            />
        )
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-muted-foreground min-h-[300px]">
                <Loader2 className="h-8 w-8 animate-spin mb-2" />
                <p>{t("loading")}</p>
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
                    <Button variant="outline" onClick={fetchTickets}>{t("tryAgain")}</Button>
                </div>
            </div>
        )
    }

    if (tickets.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-muted-foreground min-h-[300px] text-center">
                <MessageSquare className="h-10 w-10 mb-4 opacity-20" />
                <p>{t("noRequests")}</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[60%]">{t("request")}</TableHead>
                            <TableHead className="w-[20%] text-center">{t("status")}</TableHead>
                            <TableHead className="w-[20%] text-right">{t("date")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tickets.map((ticket) => (
                            <TableRow
                                key={ticket.key}
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => setSelectedTicketKey(ticket.key)}
                            >
                                <TableCell>
                                    <div className="flex flex-col gap-1">
                                        <span className="font-medium line-clamp-1" title={ticket.summary}>
                                            {ticket.summary}
                                        </span>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span>{ticket.key}</span>
                                            <span>•</span>
                                            <span>{ticket.type}</span>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="text-center">
                                    <StatusBadge status={ticket.status} />
                                </TableCell>
                                <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">
                                    {format(new Date(ticket.created), "MMM d")}
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
    let variant: "default" | "secondary" | "destructive" | "outline" = "outline";
    const lowerStatus = status.toLowerCase();

    if (lowerStatus.includes("done") || lowerStatus.includes("resolved") || lowerStatus.includes("closed")) {
        variant = "secondary";
    } else if (lowerStatus.includes("progress") || lowerStatus.includes("waiting")) {
        variant = "default";
    }

    return <Badge variant={variant} className="whitespace-nowrap text-xs px-2 py-0.5 h-6">{status}</Badge>
}
