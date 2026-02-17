"use client";

import { CheckCircle2 } from "lucide-react";
import type { KpiTaskCompletionData } from "@/types/dashboard";
import { KpiCard } from "./kpi-card";

interface Props {
  data: KpiTaskCompletionData;
}

export function KpiTaskCompletionWidget({ data }: Props) {
  const trend =
    data.completionRate >= 70 ? "up" : data.completionRate < 40 ? "down" : "neutral";

  return (
    <KpiCard
      icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
      label="Task Completion"
      value={`${data.completionRate}%`}
      subtitle={`${data.overdueCount} overdue · ${data.highPriorityPending} high priority`}
      trend={trend}
      sparklineData={data.sparkline}
      sparklineColor="#10b981"
      href="/tasks"
    />
  );
}
