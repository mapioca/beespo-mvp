"use client";

import { CalendarCheck } from "lucide-react";
import type { KpiMeetingReadinessData } from "@/types/dashboard";
import { KpiCard } from "./kpi-card";
import { useTranslations } from "next-intl";

interface Props {
  data: KpiMeetingReadinessData;
}

export function KpiMeetingReadinessWidget({ data }: Props) {
  const t = useTranslations("Dashboard.Widgets.kpi");
  let value: string;
  let subtitle: string;

  if (data.nextMeeting) {
    const meetingDate = new Date(data.nextMeeting.scheduled_date);
    const now = new Date();
    const diffDays = Math.max(
      0,
      Math.ceil((meetingDate.getTime() - now.getTime()) / 86400000)
    );
    value = diffDays <= 7 ? `${diffDays}d` : `${data.agendaReadiness}%`;
    subtitle = data.nextMeeting.title;
  } else {
    value = "—";
    subtitle = t("empty");
  }

  const trend =
    data.agendaReadiness >= 80
      ? "up"
      : data.agendaReadiness < 50
        ? "down"
        : "neutral";

  return (
    <KpiCard
      icon={<CalendarCheck className="h-4 w-4 text-violet-600" />}
      label={t("meetingReadiness")}
      value={value}
      subtitle={subtitle}
      trend={data.nextMeeting ? trend : "neutral"}
      sparklineData={data.sparkline}
      sparklineColor="#8b5cf6"
      href="/meetings/overview"
    />
  );
}
