"use client";

import Link from "next/link";
import { GitBranch, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CallingPipelineData, DragHandleProps } from "@/types/dashboard";
import { WidgetCard } from "./widget-card";

interface Props {
  data: CallingPipelineData;
  dragHandleProps?: DragHandleProps;
  isDragging?: boolean;
}

const stageColors: Record<string, string> = {
  identified:
    "border-[hsl(var(--dashboard-pill-muted-border))] bg-[hsl(var(--dashboard-pill-muted-bg))] text-[hsl(var(--dashboard-pill-muted-text))]",
  contacted:
    "border-[hsl(var(--dashboard-pill-secondary-border))] bg-[hsl(var(--dashboard-pill-secondary-bg))] text-[hsl(var(--dashboard-pill-secondary-text))]",
  interviewed:
    "border-[hsl(var(--dashboard-pill-primary-border))] bg-[hsl(var(--dashboard-pill-primary-bg))] text-[hsl(var(--dashboard-pill-primary-text))]",
  proposed:
    "border-[hsl(var(--dashboard-pill-warning-border))] bg-[hsl(var(--dashboard-pill-warning-bg))] text-[hsl(var(--dashboard-pill-warning-text))]",
  approved:
    "border-[hsl(var(--dashboard-pill-success-border))] bg-[hsl(var(--dashboard-pill-success-bg))] text-[hsl(var(--dashboard-pill-success-text))]",
  sustained:
    "border-[hsl(var(--dashboard-pill-success-border))] bg-[hsl(var(--dashboard-pill-success-bg))] text-[hsl(var(--dashboard-pill-success-text))]",
  set_apart:
    "border-[hsl(var(--dashboard-pill-success-border))] bg-[hsl(var(--dashboard-pill-success-bg))] text-[hsl(var(--dashboard-pill-success-text))]",
};

function formatStage(stage: string) {
  return stage
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function CallingPipelineWidget({
  data,
  dragHandleProps,
  isDragging,
}: Props) {
  return (
    <WidgetCard
      title="Calling Pipeline"
      icon={<GitBranch className="h-4 w-4 text-muted-foreground" />}
      dragHandleProps={dragHandleProps}
      isDragging={isDragging}
    >
      {data.processes.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No active calling processes
        </p>
      ) : (
        <div className="space-y-2">
          {data.processes.map((process, i) => (
            <div
              key={i}
              className="dashboard-widget-row -mx-2 flex items-center gap-3 rounded-md px-2 py-2"
            >
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {process.candidate_name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {process.calling_title}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                  stageColors[process.current_stage] ??
                    "border-[hsl(var(--dashboard-pill-muted-border))] bg-[hsl(var(--dashboard-pill-muted-bg))] text-[hsl(var(--dashboard-pill-muted-text))]"
                )}
              >
                {formatStage(process.current_stage)}
              </span>
            </div>
          ))}
        </div>
      )}
      {data.totalActive > 5 && (
        <Link
          href="/callings"
          className="mt-3 flex items-center gap-1 border-t pt-3 text-xs font-medium text-[hsl(var(--dashboard-link))] transition-colors hover:text-[hsl(var(--dashboard-link-hover))]"
        >
          View all {data.totalActive} processes
          <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </WidgetCard>
  );
}
