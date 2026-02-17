"use client";

import { AreaChart, Area, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { format } from "date-fns";

interface PulseSparklineProps {
  data: { date: string; completion: number }[];
}

export function PulseSparkline({ data }: PulseSparklineProps) {
  if (data.length === 0) return null;

  return (
    <div className="h-16">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="pulseGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis domain={[0, 100]} hide />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const d = payload[0].payload as { date: string; completion: number };
              return (
                <div className="bg-white shadow-lg rounded-md px-3 py-2 text-xs border">
                  <p className="font-medium">{format(new Date(d.date), "MMM d")}</p>
                  <p className="text-muted-foreground">{d.completion}% complete</p>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="completion"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#pulseGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
