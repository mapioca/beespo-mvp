"use client";

import { MessageSquare } from "lucide-react";
import type { KpiActiveDiscussionsData } from "@/types/dashboard";
import { KpiCard } from "./kpi-card";
import { useTranslations } from "next-intl";

interface Props {
  data: KpiActiveDiscussionsData;
}

export function KpiActiveDiscussionsWidget({ data }: Props) {
  const t = useTranslations("Dashboard.Widgets.kpi");
  const trend =
    data.resolutionRate >= 60
      ? "up"
      : data.pendingDecisions > 3
        ? "down"
        : "neutral";

  return (
    <KpiCard
      icon={<MessageSquare className="h-4 w-4 text-amber-600" />}
      label={t("activeDiscussions")}
      value={`${data.openCount}`}
      subtitle={`${data.pendingDecisions} decisions · ${data.resolutionRate}% resolved`}
      trend={trend}
      href="/meetings/discussions"
    />
  );
}
