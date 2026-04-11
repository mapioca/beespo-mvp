"use client";

import Link from "next/link";
import { Zap, CalendarDays, Briefcase, Megaphone, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DragHandleProps } from "@/types/dashboard";
import { WidgetCard } from "./widget-card";

interface Props {
    data?: Record<string, never>; // unused
    dragHandleProps?: DragHandleProps;
    isDragging?: boolean;
}

export function QuickActionsWidget({
    dragHandleProps,
    isDragging,
}: Props) {
    return (
        <WidgetCard
            title="Quick Actions"
            icon={<Zap className="h-4 w-4 text-muted-foreground" />}
            dragHandleProps={dragHandleProps}
            isDragging={isDragging}
        >
            <div className="space-y-2">
                <Button asChild variant="outline" className="w-full justify-start h-11 bg-white">
                    <Link href="/meetings/create">
                        <CalendarDays className="h-4 w-4 mr-3 text-primary" />
                        Create Plan or Meeting
                    </Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start h-11 bg-white">
                    <Link href="/meetings/program/business/new">
                        <Briefcase className="h-4 w-4 mr-3 text-blue-600" />
                        Add Business Item
                    </Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start h-11 bg-white">
                    <Link href="/meetings/announcements/new">
                        <Megaphone className="h-4 w-4 mr-3 text-amber-600" />
                        Create Announcement
                    </Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start h-11 bg-white">
                    <Link href="/templates/library">
                        <FileText className="h-4 w-4 mr-3 text-purple-600" />
                        Template Library
                    </Link>
                </Button>
            </div>
        </WidgetCard>
    );
}
