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
import { ArrowUp, ArrowDown, ArrowUpDown, Briefcase } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export interface BusinessItem {
    id: string;
    person_name: string;
    position_calling?: string | null;
    category: string;
    status: string;
    action_date?: string | null;
    notes?: string | null;
    workspace_business_id?: string | null;
    created_at: string;
}

interface BusinessTableProps {
    items: BusinessItem[];
    sortConfig?: { key: string; direction: 'asc' | 'desc' } | null;
    onSort?: (key: string) => void;
}


function formatCategory(category: string): string {
    return category.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function getStatusVariant(status: string): "default" | "secondary" | "outline" {
    switch (status) {
        case "pending": return "secondary";
        case "completed": return "outline";
        default: return "default";
    }
}

export function BusinessTable({ items, sortConfig, onSort }: BusinessTableProps) {
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
                        <SortHeader column="person_name" label="Person Name" className="w-[200px]" />
                        <SortHeader column="position_calling" label="Position/Calling" />
                        <SortHeader column="category" label="Category" />
                        <SortHeader column="status" label="Status" />
                        <SortHeader column="action_date" label="Action Date" />
                        <TableHead className="text-right w-[80px]">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                                <div className="flex flex-col items-center justify-center py-4">
                                    <Briefcase className="h-8 w-8 text-muted-foreground mb-2" />
                                    <p className="text-muted-foreground">No business items found.</p>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : (
                        items.map((item) => (
                            <TableRow key={item.id} className="group hover:bg-muted/50">
                                <TableCell className="font-medium">
                                    <Link href={`/business/${item.id}`} className="hover:underline">
                                        {item.person_name}
                                    </Link>
                                </TableCell>
                                <TableCell>{item.position_calling || "-"}</TableCell>
                                <TableCell>
                                    <Badge variant="outline">{formatCategory(item.category)}</Badge>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={getStatusVariant(item.status)}>
                                        {item.status === "pending" ? "Pending" : "Completed"}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {item.action_date
                                        ? format(new Date(item.action_date), "MMM d, yyyy")
                                        : "-"}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" asChild>
                                        <Link href={`/business/${item.id}`}>View</Link>
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
