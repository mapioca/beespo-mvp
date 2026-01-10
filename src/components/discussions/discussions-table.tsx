"use client";

import Link from "next/link";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    ArrowUp,
    ArrowDown,
    ArrowUpDown,
    Minus,
    Circle,
    CheckCircle2,
    AlertTriangle,
    Eye,
    CheckCheck,
    Clock,
    MessageSquare
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export interface Discussion {
    id: string;
    title: string;
    description?: string | null;
    category: string;
    status: string;
    priority: string;
    due_date?: string | null;
    workspace_discussion_id?: string | null;
    created_at: string;
}

interface DiscussionsTableProps {
    discussions: Discussion[];
    sortConfig?: { key: string; direction: 'asc' | 'desc' } | null;
    onSort?: (key: string) => void;
}

function getStatusIcon(status: string) {
    switch (status) {
        case "new": return <Circle className="h-4 w-4 text-muted-foreground" />;
        case "active": return <CheckCircle2 className="h-4 w-4 text-blue-500" />;
        case "decision_required": return <AlertTriangle className="h-4 w-4 text-destructive" />;
        case "monitoring": return <Eye className="h-4 w-4 text-muted-foreground" />;
        case "resolved": return <CheckCheck className="h-4 w-4 text-green-500" />;
        case "deferred": return <Clock className="h-4 w-4 text-muted-foreground" />;
        default: return <Circle className="h-4 w-4" />;
    }
}

function formatStatus(status: string): string {
    return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function formatCategory(category: string): string {
    return category.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function getPriorityIcon(priority: string) {
    switch (priority) {
        case "high": return <ArrowUp className="h-4 w-4 text-destructive" />;
        case "low": return <ArrowDown className="h-4 w-4 text-muted-foreground" />;
        default: return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
}

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
    switch (status) {
        case "new": return "default";
        case "active": return "default";
        case "decision_required": return "destructive";
        case "monitoring": return "secondary";
        case "resolved": return "outline";
        case "deferred": return "outline";
        default: return "default";
    }
}

export function DiscussionsTable({ discussions, sortConfig, onSort }: DiscussionsTableProps) {
    const SortHeader = ({ column, label, className }: { column: string; label: string; className?: string }) => (
        <TableHead
            className={cn("cursor-pointer bg-white hover:bg-gray-50 transition-colors", className)}
            onClick={() => onSort?.(column)}
        >
            <div className="flex items-center space-x-1">
                <span>{label}</span>
                {sortConfig?.key === column ? (
                    sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                ) : (
                    <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                )}
            </div>
        </TableHead>
    );

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow className="group">
                        <SortHeader column="workspace_discussion_id" label="ID" className="w-[100px]" />
                        <SortHeader column="title" label="Title" className="w-[300px]" />
                        <SortHeader column="category" label="Category" />
                        <SortHeader column="status" label="Status" />
                        <SortHeader column="priority" label="Priority" />
                        <SortHeader column="due_date" label="Due Date" />
                        <TableHead className="text-right w-[80px]">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {discussions.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center">
                                <div className="flex flex-col items-center justify-center py-4">
                                    <MessageSquare className="h-8 w-8 text-muted-foreground mb-2" />
                                    <p className="text-muted-foreground">No discussions found.</p>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : (
                        discussions.map((discussion) => (
                            <TableRow key={discussion.id} className="group hover:bg-muted/50">
                                <TableCell className="font-mono text-xs text-muted-foreground uppercase">
                                    {discussion.workspace_discussion_id || 'DISC-0000'}
                                </TableCell>
                                <TableCell className="font-medium">
                                    <Link href={`/discussions/${discussion.id}`} className="hover:underline">
                                        <div className="flex flex-col">
                                            <span>{discussion.title}</span>
                                            {discussion.description && (
                                                <span className="text-xs text-muted-foreground truncate max-w-[280px]">
                                                    {discussion.description}
                                                </span>
                                            )}
                                        </div>
                                    </Link>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline">{formatCategory(discussion.category)}</Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        {getStatusIcon(discussion.status)}
                                        <Badge variant={getStatusVariant(discussion.status)}>
                                            {formatStatus(discussion.status)}
                                        </Badge>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        {getPriorityIcon(discussion.priority)}
                                        <span className="text-sm capitalize">{discussion.priority}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {discussion.due_date
                                        ? format(new Date(discussion.due_date), "MMM d, yyyy")
                                        : "-"}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" asChild>
                                        <Link href={`/discussions/${discussion.id}`}>View</Link>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
