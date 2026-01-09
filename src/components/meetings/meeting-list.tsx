"use client";

import { useState } from "react";
import Link from "next/link";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Search, Calendar, ChevronRight } from "lucide-react";
import { MeetingStatusBadge } from "./meeting-status-badge";
import { formatMeetingDate, formatMeetingTime } from "@/lib/meeting-helpers";
import { Database } from "@/types/database";

type Meeting = Database['public']['Tables']['meetings']['Row'] & {
    templates: { name: string } | null;
};

interface MeetingListProps {
    meetings: Meeting[];
    isLeader: boolean;
}

export function MeetingList({ meetings, isLeader }: MeetingListProps) {
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");

    const filteredMeetings = meetings.filter((meeting) => {
        const matchesSearch = meeting.title.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === "all" || meeting.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div className="flex gap-2 w-full sm:w-auto">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search meetings..."
                            className="pl-8"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="scheduled">Scheduled</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {isLeader && (
                    <Button asChild>
                        <Link href="/meetings/new">
                            <Plus className="mr-2 h-4 w-4" />
                            New Meeting
                        </Link>
                    </Button>
                )}
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Date & Time</TableHead>
                            <TableHead className="hidden md:table-cell">Template</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredMeetings.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    No meetings found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredMeetings.map((meeting) => (
                                <TableRow key={meeting.id} className="cursor-pointer hover:bg-muted/50">
                                    <TableCell className="font-medium">
                                        <Link href={`/meetings/${meeting.id}`} className="block">
                                            {meeting.title}
                                        </Link>
                                    </TableCell>
                                    <TableCell>
                                        <Link href={`/meetings/${meeting.id}`} className="block">
                                            <div className="flex items-center text-sm">
                                                <Calendar className="mr-2 h-3 w-3 text-muted-foreground" />
                                                {formatMeetingDate(meeting.scheduled_date)}
                                            </div>
                                            <div className="text-xs text-muted-foreground pl-5">
                                                {formatMeetingTime(meeting.scheduled_date)}
                                            </div>
                                        </Link>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell">
                                        <Link href={`/meetings/${meeting.id}`} className="block text-muted-foreground">
                                            {meeting.templates?.name || "No Template"}
                                        </Link>
                                    </TableCell>
                                    <TableCell>
                                        <Link href={`/meetings/${meeting.id}`} className="block">
                                            <MeetingStatusBadge status={meeting.status} />
                                        </Link>
                                    </TableCell>
                                    <TableCell>
                                        <Link href={`/meetings/${meeting.id}`} className="flex items-center justify-center h-full w-full">
                                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
