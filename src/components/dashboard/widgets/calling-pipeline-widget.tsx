"use client";

import Link from "next/link";
import { GitBranch, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CallingPipelineData, DragHandleProps } from "@/types/dashboard";
import { WidgetCard } from "./widget-card";
import { useTranslations } from "next-intl";

interface Props {
  data: CallingPipelineData;
  dragHandleProps?: DragHandleProps;
  isDragging?: boolean;
}

const stageColors: Record<string, string> = {
  identified: "bg-gray-100 text-gray-700",
  contacted: "bg-blue-100 text-blue-700",
  interviewed: "bg-violet-100 text-violet-700",
  proposed: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  sustained: "bg-teal-100 text-teal-700",
  set_apart: "bg-green-100 text-green-700",
};
export function CallingPipelineWidget({
  data,
  dragHandleProps,
  isDragging,
}: Props) {
  const t = useTranslations("Dashboard.Widgets.callingPipeline");

  return (
    <WidgetCard
      title={t("title")}
      icon={<GitBranch className="h-4 w-4 text-muted-foreground" />}
      dragHandleProps={dragHandleProps}
      isDragging={isDragging}
    >
      {data.processes.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          {t("empty")}
        </p>
      ) : (
        <div className="space-y-2">
          {data.processes.map((process, i) => (
            <div
              key={i}
              className="flex items-center gap-3 py-2 px-2 -mx-2 rounded-md bg-gray-50/60"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {process.candidate_name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {process.calling_title}
                </p>
              </div>
              <span
                className={cn(
                  "text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0",
                  stageColors[process.current_stage] ??
                  "bg-gray-100 text-gray-700"
                )}
              >
                {t(`stages.${process.current_stage}`)}
              </span>
            </div>
          ))}
        </div>
      )}
      {data.totalActive > 5 && (
        <Link
          href="/callings"
          className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 mt-3 pt-3 border-t"
        >
          {t("viewAll", { count: data.totalActive })}
          <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </WidgetCard>
  );
}
