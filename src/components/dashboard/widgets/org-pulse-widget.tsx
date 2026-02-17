"use client";

import Link from "next/link";
import { Activity, Users, MessageSquare, Briefcase } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { OrganizationalPulseData, DragHandleProps } from "@/types/dashboard";
import { WidgetCard } from "./widget-card";
import { PulseSparkline } from "./pulse-sparkline";

interface OrgPulseWidgetProps {
  data: OrganizationalPulseData;
  dragHandleProps?: DragHandleProps;
  isDragging?: boolean;
}

export function OrgPulseWidget({
  data,
  dragHandleProps,
  isDragging,
}: OrgPulseWidgetProps) {
  return (
    <WidgetCard
      title="Organizational Pulse"
      icon={<Activity className="h-4 w-4 text-emerald-500" />}
      dragHandleProps={dragHandleProps}
      isDragging={isDragging}
    >
      {/* Sparkline */}
      {data.sparklineData.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-500 mb-2">
            Agenda Completion (Last 4 Meetings)
          </p>
          <PulseSparkline data={data.sparklineData} />
        </div>
      )}

      {/* Stats */}
      <div className="flex flex-wrap gap-2">
        {data.vacancyCount > 0 && (
          <Link href="/callings">
            <Badge
              variant="outline"
              className="cursor-pointer hover:bg-gray-50 gap-1.5"
            >
              <Users className="h-3 w-3 text-red-500" />
              {data.vacancyCount} {data.vacancyCount === 1 ? "vacancy" : "vacancies"}
            </Badge>
          </Link>
        )}
        {data.activeDiscussions > 0 && (
          <Link href="/meetings/discussions">
            <Badge
              variant="outline"
              className="cursor-pointer hover:bg-gray-50 gap-1.5"
            >
              <MessageSquare className="h-3 w-3 text-purple-500" />
              {data.activeDiscussions} discussion{data.activeDiscussions !== 1 ? "s" : ""}
            </Badge>
          </Link>
        )}
        {data.pendingBusiness > 0 && (
          <Link href="/meetings/business">
            <Badge
              variant="outline"
              className="cursor-pointer hover:bg-gray-50 gap-1.5"
            >
              <Briefcase className="h-3 w-3 text-blue-500" />
              {data.pendingBusiness} pending
            </Badge>
          </Link>
        )}
        {data.vacancyCount === 0 &&
          data.activeDiscussions === 0 &&
          data.pendingBusiness === 0 && (
            <p className="text-sm text-muted-foreground">
              Everything looks good — no open items.
            </p>
          )}
      </div>
    </WidgetCard>
  );
}
