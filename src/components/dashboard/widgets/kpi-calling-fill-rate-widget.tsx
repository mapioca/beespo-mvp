"use client";

import { Users } from "lucide-react";
import type { KpiCallingFillRateData } from "@/types/dashboard";
import { KpiCard } from "./kpi-card";
import { useTranslations } from "next-intl";

interface Props {
  data: KpiCallingFillRateData;
}

export function KpiCallingFillRateWidget({ data }: Props) {
  const t = useTranslations("Dashboard.Widgets.kpi");
  const trend =
    data.fillRate >= 80 ? "up" : data.fillRate < 50 ? "down" : "neutral";

  return (
    <KpiCard
      icon={<Users className="h-4 w-4 text-blue-600" />}
      label={t("callingFillRate")}
      value={`${data.fillRate}%`}
      subtitle={`${data.unfilledCount} vacancies of ${data.totalCallings}`}
      trend={trend}
      href="/callings"
    />
  );
}
