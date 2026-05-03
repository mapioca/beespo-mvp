"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { MiniSparkline } from "./mini-sparkline";

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle: string;
  trend?: "up" | "down" | "neutral";
  sparklineData?: { value: number }[];
  sparklineColor?: string;
  href: string;
}

export function KpiCard({
  icon,
  label,
  value,
  subtitle,
  trend = "neutral",
  sparklineData,
  sparklineColor,
  href,
}: KpiCardProps) {
  return (
    <Link
      href={href}
      className="dashboard-widget-surface block rounded-xl p-4 transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <div className="dashboard-widget-icon rounded-lg p-1.5 shrink-0">
              {icon}
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
              {label}
            </p>
          </div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p
            className={cn(
              "text-xs mt-0.5 truncate",
              trend === "up" && "text-[hsl(var(--dashboard-kpi-trend-up))]",
              trend === "down" && "text-[hsl(var(--dashboard-kpi-trend-down))]",
              trend === "neutral" && "text-muted-foreground"
            )}
          >
            {subtitle}
          </p>
        </div>
        {sparklineData && sparklineData.length >= 2 && (
          <div className="shrink-0 ml-2 mt-2">
            <MiniSparkline data={sparklineData} color={sparklineColor} />
          </div>
        )}
      </div>
    </Link>
  );
}
